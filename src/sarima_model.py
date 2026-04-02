import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from statsmodels.tsa.statespace.sarimax import SARIMAX
from statsmodels.tsa.seasonal import seasonal_decompose
from statsmodels.tsa.stattools import adfuller, acf, pacf
from statsmodels.graphics.tsaplots import plot_acf, plot_pacf
import warnings
warnings.filterwarnings('ignore')

class SARIMAForecaster:
    def __init__(self):
        self.model = None
        self.fitted_model = None
        self.forecast = None
        self.order = None
        self.seasonal_order = None
        self.train_data = None
        self.test_data = None
        
    def check_stationarity(self, data, column='consumption_mw'):
        """Check if the time series is stationary using ADF test"""
        result = adfuller(data[column].dropna())
        
        print('Augmented Dickey-Fuller Test:')
        print(f'ADF Statistic: {result[0]:.4f}')
        print(f'p-value: {result[1]:.4f}')
        print('Critical Values:')
        for key, value in result[4].items():
            print(f'\t{key}: {value:.4f}')
        
        if result[1] <= 0.05:
            print("Conclusion: The series is stationary (reject null hypothesis)")
            return True
        else:
            print("Conclusion: The series is non-stationary (fail to reject null hypothesis)")
            return False
    
    def difference_series(self, data, column='consumption_mw', d=1):
        """Apply differencing to make series stationary"""
        differenced = data[column].diff(d).dropna()
        return differenced
    
    def plot_decomposition(self, data, column='consumption_mw', period=24):
        """Plot seasonal decomposition of the time series"""
        decomposition = seasonal_decompose(data[column], model='additive', period=period)
        
        fig, axes = plt.subplots(4, 1, figsize=(12, 10))
        decomposition.observed.plot(ax=axes[0], title='Original')
        decomposition.trend.plot(ax=axes[1], title='Trend')
        decomposition.seasonal.plot(ax=axes[2], title='Seasonal')
        decomposition.resid.plot(ax=axes[3], title='Residual')
        
        plt.tight_layout()
        return fig
    
    def plot_acf_pacf(self, data, column='consumption_mw', lags=50):
        """Plot ACF and PACF to help determine ARIMA parameters"""
        fig, axes = plt.subplots(2, 1, figsize=(12, 8))
        
        plot_acf(data[column].dropna(), lags=lags, ax=axes[0])
        plot_pacf(data[column].dropna(), lags=lags, ax=axes[1])
        
        axes[0].set_title('Autocorrelation Function (ACF)')
        axes[1].set_title('Partial Autocorrelation Function (PACF)')
        
        plt.tight_layout()
        return fig
    
    def find_best_parameters(self, data, column='consumption_mw', 
                           p_range=range(0, 3), d_range=range(0, 2), 
                           q_range=range(0, 3), P_range=range(0, 2), 
                           D_range=range(0, 2), Q_range=range(0, 2), 
                           s=24):
        """Find best SARIMA parameters using grid search"""
        best_aic = float('inf')
        best_order = None
        best_seasonal_order = None
        
        print("Searching for best SARIMA parameters...")
        
        for p in p_range:
            for d in d_range:
                for q in q_range:
                    for P in P_range:
                        for D in D_range:
                            for Q in Q_range:
                                try:
                                    model = SARIMAX(data[column], 
                                                  order=(p, d, q),
                                                  seasonal_order=(P, D, Q, s),
                                                  enforce_stationarity=False,
                                                  enforce_invertibility=False)
                                    
                                    fitted = model.fit(disp=False)
                                    aic = fitted.aic
                                    
                                    if aic < best_aic:
                                        best_aic = aic
                                        best_order = (p, d, q)
                                        best_seasonal_order = (P, D, Q, s)
                                        
                                except:
                                    continue
        
        print(f"Best parameters found:")
        print(f"Order: {best_order}")
        print(f"Seasonal Order: {best_seasonal_order}")
        print(f"AIC: {best_aic:.2f}")
        
        self.order = best_order
        self.seasonal_order = best_seasonal_order
        
        return best_order, best_seasonal_order
    
    def fit_model(self, train_data, column='consumption_mw', 
                  order=None, seasonal_order=None):
        """Fit SARIMA model to training data"""
        if order is None:
            order = self.order
        if seasonal_order is None:
            seasonal_order = self.seasonal_order
            
        if order is None or seasonal_order is None:
            print("Please specify order and seasonal_order parameters")
            return None
        
        print(f"Fitting SARIMA{order}{seasonal_order} model...")
        
        # Cap to last 90 days (2160 hourly rows) — enough for SARIMA, much faster
        series = train_data[column]
        if len(series) > 2160:
            series = series.iloc[-2160:]

        self.model = SARIMAX(series,
                            order=order,
                            seasonal_order=seasonal_order,
                            enforce_stationarity=False,
                            enforce_invertibility=False,
                            simple_differencing=True)
        
        self.fitted_model = self.model.fit(disp=False, low_memory=True, maxiter=50)
        self.train_data = train_data
        
        print("Model fitted successfully!")
        print(self.fitted_model.summary())
        
        return self.fitted_model
    
    def forecast(self, steps=24):
        """Generate forecasts for specified number of steps"""
        if self.fitted_model is None:
            print("Model not fitted yet. Please fit the model first.")
            return None
        
        print(f"Generating {steps} step forecast...")
        
        # Get forecast
        forecast_result = self.fitted_model.get_forecast(steps=steps)
        self.forecast = forecast_result.predicted_mean
        conf_int = forecast_result.conf_int()
        
        return self.forecast, conf_int
    
    def evaluate_model(self, test_data, column='consumption_mw'):
        """Evaluate model performance on test data"""
        if self.fitted_model is None:
            print("Model not fitted yet. Please fit the model first.")
            return None
        
        if self.forecast is None:
            # Generate forecast for test data length
            steps = len(test_data)
            forecast, conf_int = self.forecast(steps=steps)
        else:
            forecast = self.forecast
            steps = len(forecast)
            conf_int = None
        
        # Align forecast with actual values
        actual = test_data[column].iloc[:steps]
        
        # Calculate metrics
        mse = np.mean((actual - forecast) ** 2)
        rmse = np.sqrt(mse)
        mae = np.mean(np.abs(actual - forecast))
        mape = np.mean(np.abs((actual - forecast) / actual)) * 100
        
        print(f"Model Evaluation Metrics:")
        print(f"MSE: {mse:.2f}")
        print(f"RMSE: {rmse:.2f}")
        print(f"MAE: {mae:.2f}")
        print(f"MAPE: {mape:.2f}%")
        
        return {
            'mse': mse,
            'rmse': rmse,
            'mae': mae,
            'mape': mape,
            'forecast': forecast,
            'actual': actual,
            'confidence_interval': conf_int
        }
    
    def plot_forecast(self, test_data, column='consumption_mw', 
                     title="Electricity Consumption Forecast"):
        """Plot forecast against actual values"""
        if self.fitted_model is None:
            print("Model not fitted yet. Please fit the model first.")
            return None
        
        # Get predictions for training data
        train_pred = self.fitted_model.fittedvalues
        
        # Generate forecast for test data
        steps = len(test_data)
        forecast, conf_int = self.forecast(steps)
        
        # Create plot
        plt.figure(figsize=(15, 8))
        
        # Plot training data
        plt.plot(self.train_data.index, self.train_data[column], 
                label='Training Data', color='blue', alpha=0.7)
        plt.plot(train_pred.index, train_pred, 
                label='Fitted Values', color='cyan', alpha=0.7)
        
        # Plot test data and forecast
        plt.plot(test_data.index[:steps], test_data[column].iloc[:steps], 
                label='Actual Test Data', color='green', alpha=0.7)
        plt.plot(forecast.index, forecast, 
                label='Forecast', color='red', linewidth=2)
        
        # Plot confidence intervals if available
        if conf_int is not None:
            plt.fill_between(conf_int.index, 
                           conf_int.iloc[:, 0], 
                           conf_int.iloc[:, 1], 
                           color='red', alpha=0.2, label='Confidence Interval')
        
        plt.title(title)
        plt.xlabel('Date')
        plt.ylabel('Electricity Consumption (MW)')
        plt.legend()
        plt.grid(True, alpha=0.3)
        plt.xticks(rotation=45)
        plt.tight_layout()
        
        return plt.gcf()
    
    def save_model(self, filepath):
        """Save the fitted model to disk"""
        if self.fitted_model is None:
            print("No model to save. Please fit the model first.")
            return
        
        self.fitted_model.save(filepath)
        print(f"Model saved to {filepath}")
    
    def load_model(self, filepath):
        """Load a saved model from disk"""
        from statsmodels.tsa.statespace.sarimax import SARIMAXResults
        
        try:
            self.fitted_model = SARIMAXResults.load(filepath)
            print(f"Model loaded from {filepath}")
            return self.fitted_model
        except Exception as e:
            print(f"Error loading model: {e}")
            return None

if __name__ == "__main__":
    # Example usage
    from data_preprocessing import DataPreprocessor
    
    # Load and preprocess data
    preprocessor = DataPreprocessor()
    data = preprocessor.generate_sample_data()
    cleaned_data = preprocessor.clean_data()
    train_data, test_data = preprocessor.split_data()
    
    # Initialize and use SARIMA forecaster
    forecaster = SARIMAForecaster()
    
    # Check stationarity
    forecaster.check_stationarity(train_data)
    
    # Find best parameters (this may take some time)
    # For faster execution, you can skip this and use known good parameters
    # best_order, best_seasonal_order = forecaster.find_best_parameters(train_data)
    
    # Use predefined parameters for faster execution
    best_order = (1, 1, 1)
    best_seasonal_order = (1, 1, 1, 24)
    
    # Fit model
    model = forecaster.fit_model(train_data, order=best_order, seasonal_order=best_seasonal_order)
    
    # Evaluate model
    results = forecaster.evaluate_model(test_data)
    
    # Plot results
    fig = forecaster.plot_forecast(test_data)
    plt.show()
