# ElectroForecast — Electricity Consumption Forecasting

A web application for forecasting electricity consumption using **SARIMA** (Seasonal AutoRegressive Integrated Moving Average) models. Built with Flask on the backend and a responsive dark-theme dashboard on the frontend.

![Python](https://img.shields.io/badge/Python-3.10%2B-blue)
![Flask](https://img.shields.io/badge/Flask-3.0.3-lightgrey)
![statsmodels](https://img.shields.io/badge/statsmodels-0.14.2-orange)

---

## Features

- **Load data** — use built-in sample data (2 years of synthetic daily consumption) or upload your own CSV
- **SARIMA modelling** — configure all parameters (p, d, q, P, D, Q, s) manually or let the app auto-detect the best combination via AIC grid search
- **Interactive chart** — historical data, fitted values, forecast line, and 95% confidence interval band (Chart.js)
- **Forecast horizon** — slider from 1 to 365 days
- **Statistics panel** — MAE, RMSE, AIC, and data point count
- **Forecast table** — scrollable date / forecast / lower CI / upper CI breakdown
- **CSV export** — download the forecast results with a single click

---

## Project Structure

```
.
├── app.py                  # Flask backend & SARIMA logic
├── requirements.txt        # Python dependencies
├── static/
│   ├── css/
│   │   └── style.css       # Dark theme stylesheet
│   └── js/
│       └── main.js         # Chart.js + UI interactions
└── templates/
    └── index.html          # Single-page dashboard
```

---

## Getting Started

### Prerequisites

- Python 3.10 or higher
- pip

### Installation

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd <repo-folder>

# 2. Create and activate a virtual environment (recommended)
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt
```

### Running the App

```bash
python app.py
```

Then open [http://localhost:5000](http://localhost:5000) in your browser.

---

## CSV Format

Upload a CSV file with at least two columns:

| date       | consumption |
|------------|-------------|
| 2023-01-01 | 245.3       |
| 2023-01-02 | 238.7       |
| ...        | ...         |

- The date column can be named `date`, `time`, or `timestamp`
- The value column can be named anything (first non-date column is used)
- Data is automatically resampled to daily frequency and gaps are interpolated

---

## API Endpoints

| Method | Endpoint           | Description                              |
|--------|--------------------|------------------------------------------|
| GET    | `/`                | Serve the dashboard                      |
| GET    | `/api/sample-data` | Load built-in synthetic dataset          |
| POST   | `/api/upload`      | Upload a CSV file                        |
| POST   | `/api/forecast`    | Fit SARIMA and return forecast           |
| POST   | `/api/auto-params` | Grid-search best SARIMA params by AIC    |

---

## Dependencies

| Package        | Version |
|----------------|---------|
| Flask          | 3.0.3   |
| flask-cors     | 4.0.1   |
| statsmodels    | 0.14.2  |
| pandas         | 2.2.2   |
| numpy          | 1.26.4  |
| scikit-learn   | 1.5.0   |
| scipy          | 1.13.1  |

Frontend libraries are loaded via CDN (no install needed):
- [Bootstrap 5.3](https://getbootstrap.com/)
- [Bootstrap Icons 1.11](https://icons.getbootstrap.com/)
- [Chart.js 4.4](https://www.chartjs.org/)

---

## License

MIT
