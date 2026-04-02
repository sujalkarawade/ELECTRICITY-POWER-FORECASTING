# Electricity Power Forecasting

A web application for electricity consumption forecasting using SARIMA models.

## Project Structure

```
├── app.py                  # Flask web server & API
├── main.py                 # CLI pipeline (standalone)
├── requirements.txt        # Python dependencies
├── package.json            # npm scripts (dev runner)
├── src/
│   ├── data_preprocessing.py
│   ├── sarima_model.py
│   └── visualization.py
├── templates/
│   └── index.html          # Web UI
├── static/css/main.css
├── uploads/                # Uploaded CSV files
├── outputs/                # Generated plots & forecasts
└── models/                 # Saved model files
```

## Setup

```bash
pip install -r requirements.txt
npm install
```

## Running

**Web app:**
```bash
npm run dev
```
Opens http://localhost:5000 automatically.

**CLI pipeline:**
```bash
python main.py
```

## Usage

The web app walks you through 4 steps:

1. **Upload** — drop a CSV file with `datetime` and `consumption_mw` columns
2. **Preview** — review data stats and sample rows
3. **Train** — configure SARIMA(p,d,q)(P,D,Q,s) parameters and train
4. **Results** — view performance metrics, plots, and generate future forecasts

Don't have data? Use the "Download sample CSV" link on the upload page.

## CSV Format

| Column | Description |
|---|---|
| `datetime` | Timestamp (`YYYY-MM-DD HH:MM:SS`) |
| `consumption_mw` | Electricity consumption in megawatts |

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/upload` | Upload and process CSV |
| `POST` | `/train_model` | Train SARIMA model |
| `POST` | `/forecast` | Generate future forecast |
| `GET` | `/download_forecast` | Download forecast CSV |
| `GET` | `/sample_data` | Generate sample data |
| `GET` | `/health` | Health check |

## Default SARIMA Parameters

- Order: `(1, 1, 1)`
- Seasonal order: `(1, 1, 1, 24)` — 24-hour seasonality for hourly data
