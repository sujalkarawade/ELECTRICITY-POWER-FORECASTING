import io
import json
import warnings
import traceback
from datetime import datetime, timedelta

import numpy as np
import pandas as pd
from flask import Flask, jsonify, request, render_template, send_from_directory
from flask_cors import CORS
from statsmodels.tsa.statespace.sarimax import SARIMAX
from sklearn.metrics import mean_absolute_error, mean_squared_error

warnings.filterwarnings("ignore")

app = Flask(__name__, template_folder='features', static_folder='features')
CORS(app)

# ---------------------------------------------------------------------------
# In-memory store for the uploaded / loaded dataset
# ---------------------------------------------------------------------------
_store: dict = {"df": None}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def generate_sample_data() -> pd.DataFrame:
    """Generate two years of synthetic daily electricity consumption."""
    np.random.seed(42)
    periods = 730  # ~2 years of daily data
    dates = pd.date_range(start="2022-01-01", periods=periods, freq="D")

    t = np.arange(periods)

    # Long-term upward trend
    trend = 200 + 0.05 * t

    # Yearly seasonality (peak in summer & winter)
    yearly = 40 * np.sin(2 * np.pi * t / 365 - np.pi / 2) + \
             20 * np.cos(4 * np.pi * t / 365)

    # Weekly seasonality (lower on weekends)
    weekly = -15 * (np.sin(2 * np.pi * t / 7) > 0.5).astype(float)

    # Gaussian noise
    noise = np.random.normal(0, 8, periods)

    consumption = trend + yearly + weekly + noise
    consumption = np.clip(consumption, 100, None)  # no negatives

    df = pd.DataFrame({"date": dates, "consumption": np.round(consumption, 2)})
    return df


def preprocess(df: pd.DataFrame) -> pd.Series:
    """
    Normalise a DataFrame into a clean daily time-series.
    Expects columns: date (or datetime) + consumption (or value / kwh / …).
    """
    df = df.copy()
    df.columns = [c.strip().lower() for c in df.columns]

    # Identify date column
    date_col = next(
        (c for c in df.columns if "date" in c or "time" in c or "timestamp" in c),
        df.columns[0],
    )
    # Identify value column
    value_col = next(
        (c for c in df.columns if c not in (date_col,)),
        df.columns[1],
    )

    df[date_col] = pd.to_datetime(df[date_col], infer_datetime_format=True)
    df = df.set_index(date_col)[[value_col]].rename(columns={value_col: "consumption"})
    df = df.sort_index()

    # Resample to daily, fill gaps
    df = df.resample("D").mean()
    df["consumption"] = df["consumption"].interpolate(method="time").ffill().bfill()

    return df["consumption"]


def fit_sarima(series: pd.Series, order: tuple, seasonal_order: tuple):
    """Fit a SARIMAX model and return the fitted result."""
    model = SARIMAX(
        series,
        order=order,
        seasonal_order=seasonal_order,
        enforce_stationarity=False,
        enforce_invertibility=False,
    )
    result = model.fit(disp=False, maxiter=200)
    return result


def compute_metrics(series: pd.Series, fitted_values: pd.Series) -> dict:
    """Return MAE, RMSE, and AIC (AIC passed separately)."""
    common = series.index.intersection(fitted_values.index)
    actual = series.loc[common]
    predicted = fitted_values.loc[common]
    mae = mean_absolute_error(actual, predicted)
    rmse = np.sqrt(mean_squared_error(actual, predicted))
    return {"mae": round(mae, 4), "rmse": round(rmse, 4)}


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.route("/")
def index():
    return render_template("data/page_data.html", active_page="data")


@app.route("/configure")
def configure():
    return render_template("configure/page_configure.html", active_page="configure")


@app.route("/results")
def results():
    return render_template("results/page_results.html", active_page="results")


@app.route("/api/sample-data", methods=["GET"])
def sample_data():
    df = generate_sample_data()
    _store["df"] = preprocess(df)
    series = _store["df"]

    dates = [d.strftime("%Y-%m-%d") for d in series.index]
    values = [round(float(v), 2) for v in series.values]

    return jsonify(
        {
            "success": True,
            "dates": dates,
            "values": values,
            "message": f"Loaded {len(dates)} days of sample data.",
        }
    )


@app.route("/api/upload", methods=["POST"])
def upload():
    if "file" not in request.files:
        return jsonify({"success": False, "error": "No file part in request."}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"success": False, "error": "No file selected."}), 400

    try:
        content = file.read().decode("utf-8")
        df = pd.read_csv(io.StringIO(content))
        series = preprocess(df)
        _store["df"] = series

        dates = [d.strftime("%Y-%m-%d") for d in series.index]
        values = [round(float(v), 2) for v in series.values]

        return jsonify(
            {
                "success": True,
                "dates": dates,
                "values": values,
                "message": f"Uploaded {len(dates)} records.",
            }
        )
    except Exception as exc:
        return jsonify({"success": False, "error": str(exc)}), 500


@app.route("/api/auto-params", methods=["POST"])
def auto_params():
    """Grid-search a small SARIMA parameter space and return the best by AIC."""
    if _store["df"] is None:
        return jsonify({"success": False, "error": "No data loaded."}), 400

    series = _store["df"]

    body = request.get_json(silent=True) or {}
    seasonal_period = int(body.get("s", 7))

    best_aic = np.inf
    best_params = {"p": 1, "d": 1, "q": 1, "P": 1, "D": 1, "Q": 1, "s": seasonal_period}

    # Reduced grid to keep response time reasonable
    p_values = [0, 1, 2]
    d_values = [0, 1]
    q_values = [0, 1, 2]
    P_values = [0, 1]
    D_values = [0, 1]
    Q_values = [0, 1]

    tried = 0
    for p in p_values:
        for d in d_values:
            for q in q_values:
                for P in P_values:
                    for D in D_values:
                        for Q in Q_values:
                            try:
                                res = fit_sarima(
                                    series,
                                    (p, d, q),
                                    (P, D, Q, seasonal_period),
                                )
                                if res.aic < best_aic:
                                    best_aic = res.aic
                                    best_params = {
                                        "p": p, "d": d, "q": q,
                                        "P": P, "D": D, "Q": Q,
                                        "s": seasonal_period,
                                    }
                                tried += 1
                            except Exception:
                                pass

    return jsonify(
        {
            "success": True,
            "params": best_params,
            "aic": round(best_aic, 2),
            "models_tried": tried,
        }
    )


@app.route("/api/forecast", methods=["POST"])
def forecast():
    if _store["df"] is None:
        return jsonify({"success": False, "error": "No data loaded."}), 400

    body = request.get_json(silent=True) or {}

    p = int(body.get("p", 1))
    d = int(body.get("d", 1))
    q = int(body.get("q", 1))
    P = int(body.get("P", 1))
    D = int(body.get("D", 1))
    Q = int(body.get("Q", 1))
    s = int(body.get("s", 7))
    horizon = int(body.get("horizon", 30))
    horizon = max(1, min(horizon, 365))

    series = _store["df"]

    try:
        result = fit_sarima(series, (p, d, q), (P, D, Q, s))
    except Exception as exc:
        return jsonify({"success": False, "error": f"Model fitting failed: {exc}"}), 500

    # In-sample fitted values
    fitted = result.fittedvalues

    # Out-of-sample forecast
    forecast_obj = result.get_forecast(steps=horizon)
    forecast_mean = forecast_obj.predicted_mean
    conf_int = forecast_obj.conf_int(alpha=0.05)

    # Build forecast dates
    last_date = series.index[-1]
    forecast_dates = pd.date_range(
        start=last_date + timedelta(days=1), periods=horizon, freq="D"
    )

    metrics = compute_metrics(series, fitted)
    metrics["aic"] = round(result.aic, 2)

    # Serialise historical data
    hist_dates = [d.strftime("%Y-%m-%d") for d in series.index]
    hist_values = [round(float(v), 2) for v in series.values]

    # Serialise fitted values (aligned to historical index)
    fitted_aligned = fitted.reindex(series.index)
    fitted_values = [
        round(float(v), 2) if not np.isnan(v) else None
        for v in fitted_aligned.values
    ]

    # Serialise forecast
    fc_dates = [d.strftime("%Y-%m-%d") for d in forecast_dates]
    fc_values = [round(float(v), 2) for v in forecast_mean.values]
    fc_lower = [round(float(v), 2) for v in conf_int.iloc[:, 0].values]
    fc_upper = [round(float(v), 2) for v in conf_int.iloc[:, 1].values]

    return jsonify(
        {
            "success": True,
            "historical": {"dates": hist_dates, "values": hist_values},
            "fitted": {"dates": hist_dates, "values": fitted_values},
            "forecast": {
                "dates": fc_dates,
                "values": fc_values,
                "lower": fc_lower,
                "upper": fc_upper,
            },
            "metrics": metrics,
            "params": {"p": p, "d": d, "q": q, "P": P, "D": D, "Q": Q, "s": s},
        }
    )


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    app.run(debug=True, port=5000)
