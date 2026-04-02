# Electricity Power Forecasting using SARIMA Model

A comprehensive project for forecasting electricity power consumption using Seasonal Autoregressive Integrated Moving Average (SARIMA) models.

## 🚀 Project Overview

This project implements a complete pipeline for electricity power forecasting, including:
- Data preprocessing and feature engineering
- Time series analysis and decomposition
- SARIMA model development and optimization
- Forecasting and performance evaluation
- Interactive visualizations

## 📁 Project Structure

```
ELECTRICITY POWER FORECASTING/
├── data/                          # Data files
│   └── processed_electricity_data.csv
├── src/                           # Source code
│   ├── data_preprocessing.py      # Data preprocessing utilities
│   ├── sarima_model.py           # SARIMA model implementation
│   └── visualization.py          # Visualization utilities
├── models/                        # Trained models
│   └── sarima_electricity_model.pkl
├── outputs/                       # Output files and plots
│   ├── time_series_plot.png
│   ├── seasonal_patterns.png
│   ├── decomposition.png
│   ├── acf_pacf_plot.png
│   ├── forecast_comparison.png
│   ├── performance_metrics.png
│   ├── residuals_analysis.png
│   ├── future_forecast.png
│   └── future_forecasts.csv
├── notebooks/                     # Jupyter notebooks (optional)
├── main.py                        # Main execution script
├── requirements.txt               # Python dependencies
└── README.md                      # Project documentation
```

## 🛠️ Installation

### Prerequisites

- Python 3.8 or higher
- pip package manager

### Setup

1. **Clone or download the project**
   ```bash
   cd "ELECTRICITY POWER FORECASTING"
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Create necessary directories** (if not already created)
   ```bash
   mkdir data models outputs notebooks
   ```

## 🚀 Quick Start

### Running the Complete Pipeline

Execute the main script to run the entire forecasting pipeline:

```bash
python main.py
```

This will:
1. Generate sample electricity consumption data
2. Preprocess and clean the data
3. Perform exploratory data analysis
4. Develop and train a SARIMA model
5. Generate forecasts and evaluate performance
6. Create visualizations and save results

### Using Your Own Data

To use your own electricity consumption data:

1. **Prepare your data** in CSV format with columns:
   - `datetime`: Timestamp (YYYY-MM-DD HH:MM:SS format)
   - `consumption_mw`: Electricity consumption in megawatts
   - Optional: `temperature`, `humidity`, etc.

2. **Modify the main.py script**:
   ```python
   # Replace this line:
   data = preprocessor.generate_sample_data()
   
   # With:
   data = preprocessor.load_data('path/to/your/data.csv')
   ```

## 📊 Features

### Data Preprocessing (`src/data_preprocessing.py`)

- **Data Loading**: Support for CSV files with automatic datetime parsing
- **Sample Data Generation**: Realistic synthetic data with daily, weekly, and seasonal patterns
- **Data Cleaning**: Missing value handling, outlier detection, and data validation
- **Feature Engineering**: Lag features, rolling statistics, and time-based features
- **Train-Test Split**: Chronological splitting for time series data

### SARIMA Modeling (`src/sarima_model.py`)

- **Stationarity Testing**: Augmented Dickey-Fuller test
- **Parameter Optimization**: Grid search for optimal SARIMA parameters
- **Model Fitting**: Efficient SARIMA model training
- **Forecasting**: Multi-step ahead forecasting with confidence intervals
- **Model Evaluation**: Comprehensive metrics (RMSE, MAE, MAPE)
- **Model Persistence**: Save and load trained models

### Visualization (`src/visualization.py`)

- **Time Series Plots**: Basic and interactive time series visualization
- **Seasonal Analysis**: Hourly, daily, and monthly consumption patterns
- **Decomposition**: Trend, seasonal, and residual components
- **Forecast Comparison**: Actual vs predicted values with confidence intervals
- **Residual Analysis**: Model diagnostics and validation
- **Interactive Plots**: Plotly-based interactive visualizations

## 📈 Model Details

### SARIMA Model Parameters

The project uses SARIMA(p,d,q)(P,D,Q,s) where:
- **p**: Autoregressive order
- **d**: Differencing order
- **q**: Moving average order
- **P**: Seasonal autoregressive order
- **D**: Seasonal differencing order
- **Q**: Seasonal moving average order
- **s**: Seasonal period (24 for hourly data)

### Default Parameters

For electricity consumption with hourly data:
- **Order**: (1, 1, 1)
- **Seasonal Order**: (1, 1, 1, 24)

These parameters capture:
- Daily seasonality (24-hour cycle)
- Weekly patterns
- Long-term trends
- Autocorrelation structure

## 📊 Performance Metrics

The model is evaluated using:

- **RMSE (Root Mean Square Error)**: Measures average prediction error
- **MAE (Mean Absolute Error)**: Average absolute prediction error
- **MAPE (Mean Absolute Percentage Error)**: Percentage-based error metric

## 🔧 Customization

### Modifying SARIMA Parameters

```python
# In main.py, change the parameters:
best_order = (2, 1, 2)  # Custom non-seasonal parameters
best_seasonal_order = (1, 1, 1, 24)  # Custom seasonal parameters
```

### Changing Forecast Horizon

```python
# Modify the forecast steps:
future_forecast, future_conf_int = forecaster.forecast(steps=336)  # 14 days
```

### Adding New Features

Extend the `add_features()` method in `DataPreprocessor` class:

```python
def add_custom_features(self):
    # Add your custom features here
    df = self.processed_data.copy()
    df['custom_feature'] = your_custom_logic
    return df
```

## 📝 Example Output

### Performance Summary
```
Model Performance Summary:
  - RMSE: 45.23 MW
  - MAE: 35.67 MW
  - MAPE: 3.45%
  - Model: SARIMA(1,1,1)(1,1,1,24)
```

### Generated Files
- **Data**: `data/processed_electricity_data.csv`
- **Model**: `models/sarima_electricity_model.pkl`
- **Forecasts**: `outputs/future_forecasts.csv`
- **Visualizations**: `outputs/*.png`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Statsmodels library for SARIMA implementation
- Pandas and NumPy for data manipulation
- Matplotlib, Seaborn, and Plotly for visualizations
- Scikit-learn for additional utilities

## 📞 Support

For questions or issues:
1. Check the existing documentation
2. Review the code comments
3. Create an issue with detailed information

---

**Note**: This project generates synthetic data for demonstration purposes. For real-world applications, replace the sample data generation with actual electricity consumption data from your specific region or utility.
