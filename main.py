#!/usr/bin/env python3
"""
Electricity Power Forecasting using SARIMA Model
Main script to run the complete forecasting pipeline
"""

import os
import sys
import warnings
warnings.filterwarnings('ignore')

# Add src directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

from src.data_preprocessing import DataPreprocessor
from src.sarima_model import SARIMAForecaster
from src.visualization import ElectricityVisualizer

def main():
    print("=" * 60)
    print("ELECTRICITY POWER FORECASTING USING SARIMA MODEL")
    print("=" * 60)
    
    # Initialize components
    preprocessor = DataPreprocessor()
    forecaster = SARIMAForecaster()
    visualizer = ElectricityVisualizer()
    
    # Step 1: Data Generation and Preprocessing
    print("\n1. DATA GENERATION AND PREPROCESSING")
    print("-" * 40)
    
    # Generate sample data (you can replace this with loading your own data)
    print("Generating sample electricity consumption data...")
    data = preprocessor.generate_sample_data(start_date='2020-01-01', end_date='2023-12-31')
    
    # Clean and preprocess data
    print("Cleaning and preprocessing data...")
    cleaned_data = preprocessor.clean_data()
    
    # Add features
    print("Adding additional features...")
    featured_data = preprocessor.add_features()
    
    # Split data into train and test
    print("Splitting data into train and test sets...")
    train_data, test_data = preprocessor.split_data(test_size=0.2)
    
    # Save processed data
    preprocessor.save_processed_data('data/processed_electricity_data.csv')
    
    # Step 2: Exploratory Data Analysis
    print("\n2. EXPLORATORY DATA ANALYSIS")
    print("-" * 40)
    
    # Create visualizations
    print("Creating time series plot...")
    fig1 = visualizer.plot_time_series(cleaned_data, title="Electricity Consumption Time Series")
    visualizer.save_plot(fig1, 'outputs/time_series_plot.png')
    
    print("Creating seasonal patterns plot...")
    fig2 = visualizer.plot_seasonal_patterns(cleaned_data)
    visualizer.save_plot(fig2, 'outputs/seasonal_patterns.png')
    
    print("Creating decomposition plot...")
    fig3 = visualizer.plot_decomposition(cleaned_data, period=24)
    visualizer.save_plot(fig3, 'outputs/decomposition.png')
    
    # Step 3: SARIMA Model Development
    print("\n3. SARIMA MODEL DEVELOPMENT")
    print("-" * 40)
    
    # Check stationarity
    print("Checking stationarity of the time series...")
    is_stationary = forecaster.check_stationarity(train_data)
    
    if not is_stationary:
        print("Series is non-stationary. Differencing will be applied during modeling.")
    
    # Plot ACF and PACF
    print("Plotting ACF and PACF for parameter selection...")
    fig4 = forecaster.plot_acf_pacf(train_data, lags=50)
    visualizer.save_plot(fig4, 'outputs/acf_pacf_plot.png')
    
    # Find best parameters (optional - can be time-consuming)
    print("\nDo you want to find optimal SARIMA parameters automatically? (y/n)")
    print("Note: This may take several minutes...")
    
    # For demonstration, we'll use predefined parameters
    # Uncomment the following lines for automatic parameter search
    # user_input = input().lower()
    # if user_input == 'y':
    #     best_order, best_seasonal_order = forecaster.find_best_parameters(train_data)
    # else:
    #     # Use predefined parameters based on typical electricity consumption patterns
    #     best_order = (1, 1, 1)
    #     best_seasonal_order = (1, 1, 1, 24)
    
    # Use predefined parameters for faster execution
    print("Using predefined SARIMA parameters based on electricity consumption patterns...")
    best_order = (1, 1, 1)
    best_seasonal_order = (1, 1, 1, 24)
    
    print(f"Selected parameters: SARIMA{best_order}{best_seasonal_order}")
    
    # Fit the model
    print("Fitting SARIMA model...")
    model = forecaster.fit_model(train_data, order=best_order, seasonal_order=best_seasonal_order)
    
    # Save the model
    forecaster.save_model('models/sarima_electricity_model.pkl')
    
    # Step 4: Forecasting and Evaluation
    print("\n4. FORECASTING AND EVALUATION")
    print("-" * 40)
    
    # Generate forecasts
    print("Generating forecasts...")
    forecast, conf_int = forecaster.forecast(steps=len(test_data))
    
    # Evaluate model performance
    print("Evaluating model performance...")
    results = forecaster.evaluate_model(test_data)
    
    # Create forecast comparison plot
    print("Creating forecast comparison plot...")
    fig5 = forecaster.plot_forecast(test_data, title="SARIMA Model: Forecast vs Actual")
    visualizer.save_plot(fig5, 'outputs/forecast_comparison.png')
    
    # Create model performance metrics plot
    print("Creating performance metrics plot...")
    fig6 = visualizer.plot_model_performance_metrics(results)
    visualizer.save_plot(fig6, 'outputs/performance_metrics.png')
    
    # Residuals analysis
    print("Performing residuals analysis...")
    residuals = forecaster.fitted_model.resid
    fig7 = visualizer.plot_residuals_analysis(residuals)
    visualizer.save_plot(fig7, 'outputs/residuals_analysis.png')
    
    # Step 5: Generate Future Forecasts
    print("\n5. FUTURE FORECASTS")
    print("-" * 40)
    
    # Generate forecasts for next 7 days (168 hours)
    print("Generating forecasts for next 7 days...")
    future_forecast, future_conf_int = forecaster.forecast(steps=168)
    
    # Create future forecast plot
    fig8 = visualizer.plot_forecast_comparison(
        train_data.iloc[-168:],  # Last week of training data
        test_data.iloc[:168],    # First week of test data
        future_forecast,
        future_conf_int,
        title="7-Day Electricity Consumption Forecast"
    )
    visualizer.save_plot(fig8, 'outputs/future_forecast.png')
    
    # Save forecasts to CSV
    forecast_df = pd.DataFrame({
        'datetime': future_forecast.index,
        'forecast_consumption_mw': future_forecast.values,
        'lower_ci': future_conf_int.iloc[:, 0].values,
        'upper_ci': future_conf_int.iloc[:, 1].values
    })
    forecast_df.to_csv('outputs/future_forecasts.csv', index=False)
    
    # Step 6: Summary Report
    print("\n6. SUMMARY REPORT")
    print("-" * 40)
    
    print(f"Model Performance Summary:")
    print(f"  - RMSE: {results['rmse']:.2f} MW")
    print(f"  - MAE: {results['mae']:.2f} MW")
    print(f"  - MAPE: {results['mape']:.2f}%")
    print(f"  - Model: SARIMA{best_order}{best_seasonal_order}")
    
    print(f"\nData Summary:")
    print(f"  - Total observations: {len(cleaned_data)}")
    print(f"  - Training observations: {len(train_data)}")
    print(f"  - Test observations: {len(test_data)}")
    print(f"  - Date range: {cleaned_data.index.min()} to {cleaned_data.index.max()}")
    
    print(f"\nForecast Summary:")
    print(f"  - Forecast period: Next 7 days (168 hours)")
    print(f"  - Average forecast: {future_forecast.mean():.2f} MW")
    print(f"  - Min forecast: {future_forecast.min():.2f} MW")
    print(f"  - Max forecast: {future_forecast.max():.2f} MW")
    
    print(f"\nOutput Files Generated:")
    print(f"  - Data: data/processed_electricity_data.csv")
    print(f"  - Model: models/sarima_electricity_model.pkl")
    print(f"  - Forecasts: outputs/future_forecasts.csv")
    print(f"  - Plots: outputs/*.png")
    
    print("\n" + "=" * 60)
    print("ELECTRICITY POWER FORECASTING PIPELINE COMPLETED SUCCESSFULLY!")
    print("=" * 60)
    
    return forecaster, results, forecast_df

if __name__ == "__main__":
    # Create outputs directory if it doesn't exist
    os.makedirs('outputs', exist_ok=True)
    os.makedirs('models', exist_ok=True)
    
    # Run the main pipeline
    try:
        forecaster, results, forecasts = main()
        print("\nPipeline completed successfully!")
    except Exception as e:
        print(f"\nError in pipeline: {e}")
        import traceback
        traceback.print_exc()
