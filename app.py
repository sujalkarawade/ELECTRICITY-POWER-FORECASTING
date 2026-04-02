from flask import Flask, render_template, request, jsonify, send_file
import os
import pandas as pd
import json
from datetime import datetime
import sys
import warnings
warnings.filterwarnings('ignore')

# Add src directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

from src.data_preprocessing import DataPreprocessor
from src.sarima_model import SARIMAForecaster
from src.visualization import ElectricityVisualizer

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

# Ensure upload directory exists
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs('outputs', exist_ok=True)
os.makedirs('models', exist_ok=True)

# Global variables to store model and data
current_model = None
current_data = None
current_forecast = None

@app.route('/')
def index():
    """Main page with file upload interface"""
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_file():
    """Handle CSV file upload"""
    global current_data
    
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if file and file.filename.endswith('.csv'):
        filename = datetime.now().strftime("%Y%m%d_%H%M%S") + '_' + file.filename
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        try:
            # Load and process the data
            preprocessor = DataPreprocessor()
            data = preprocessor.load_data(filepath)
            
            if data is None:
                return jsonify({'error': 'Failed to load CSV file'}), 400
            
            # Check required columns
            required_columns = ['datetime', 'consumption_mw']
            missing_columns = [col for col in required_columns if col not in data.columns]
            
            if missing_columns:
                return jsonify({
                    'error': f'Missing required columns: {missing_columns}. Required: datetime, consumption_mw'
                }), 400
            
            # Process the data
            cleaned_data = preprocessor.clean_data()
            featured_data = preprocessor.add_features()
            
            # Store current data
            current_data = {
                'original': data,
                'processed': featured_data,
                'preprocessor': preprocessor
            }
            
            # Return data preview
            preview = {
                'columns': list(featured_data.columns),
                'shape': featured_data.shape,
                'date_range': {
                    'start': str(featured_data.index.min()),
                    'end': str(featured_data.index.max())
                },
                'sample_data': featured_data.head(10).to_dict('records'),
                'statistics': featured_data[['consumption_mw']].describe().to_dict()
            }
            
            return jsonify({
                'success': True,
                'message': 'File uploaded and processed successfully',
                'preview': preview
            })
            
        except Exception as e:
            return jsonify({'error': f'Error processing file: {str(e)}'}), 500
    
    return jsonify({'error': 'Invalid file format. Please upload a CSV file'}), 400

@app.route('/train_model', methods=['POST'])
def train_model():
    """Train SARIMA model on uploaded data"""
    global current_model, current_data
    
    if current_data is None:
        return jsonify({'error': 'No data available. Please upload a CSV file first'}), 400
    
    try:
        # Get parameters from request
        params = request.get_json() or {}
        order = tuple(params.get('order', [1, 1, 1]))
        seasonal_order = tuple(params.get('seasonal_order', [1, 1, 1, 24]))
        
        # Split data
        preprocessor = current_data['preprocessor']
        train_data, test_data = preprocessor.split_data(test_size=0.2)
        
        # Initialize and train model
        forecaster = SARIMAForecaster()
        
        # Check stationarity
        is_stationary = forecaster.check_stationarity(train_data)
        
        # Fit model
        model = forecaster.fit_model(
            train_data, 
            order=order, 
            seasonal_order=seasonal_order
        )
        
        # Generate forecasts
        forecast, conf_int = forecaster.forecast(steps=len(test_data))
        
        # Evaluate model
        results = forecaster.evaluate_model(test_data)
        
        # Store model
        current_model = forecaster
        
        # Generate visualizations
        visualizer = ElectricityVisualizer()
        
        # Create plots and save them
        fig1 = visualizer.plot_time_series(current_data['processed'])
        fig1.savefig('static/time_series.png', bbox_inches='tight', dpi=150)
        
        fig2 = visualizer.plot_seasonal_patterns(current_data['processed'])
        fig2.savefig('static/seasonal_patterns.png', bbox_inches='tight', dpi=150)
        
        fig3 = forecaster.plot_forecast(test_data)
        fig3.savefig('static/forecast.png', bbox_inches='tight', dpi=150)
        
        fig4 = visualizer.plot_model_performance_metrics(results)
        fig4.savefig('static/performance.png', bbox_inches='tight', dpi=150)
        
        # Save model
        forecaster.save_model('models/web_model.pkl')
        
        response = {
            'success': True,
            'message': 'Model trained successfully',
            'model_info': {
                'order': order,
                'seasonal_order': seasonal_order,
                'is_stationary': is_stationary
            },
            'performance': {
                'rmse': results['rmse'],
                'mae': results['mae'],
                'mape': results['mape']
            },
            'plots': {
                'time_series': '/static/time_series.png',
                'seasonal_patterns': '/static/seasonal_patterns.png',
                'forecast': '/static/forecast.png',
                'performance': '/static/performance.png'
            }
        }
        
        return jsonify(response)
        
    except Exception as e:
        return jsonify({'error': f'Error training model: {str(e)}'}), 500

@app.route('/forecast', methods=['POST'])
def generate_forecast():
    """Generate future forecasts"""
    global current_model, current_forecast
    
    if current_model is None:
        return jsonify({'error': 'No trained model available. Please train a model first'}), 400
    
    try:
        # Get forecast parameters
        params = request.get_json() or {}
        steps = params.get('steps', 168)  # Default 7 days
        
        # Generate forecast
        forecast, conf_int = current_model.forecast(steps=steps)
        
        # Create forecast dataframe
        forecast_df = pd.DataFrame({
            'datetime': forecast.index,
            'forecast': forecast.values,
            'lower_ci': conf_int.iloc[:, 0].values,
            'upper_ci': conf_int.iloc[:, 1].values
        })
        
        # Store forecast
        current_forecast = forecast_df
        
        # Save forecast
        forecast_df.to_csv('outputs/web_forecast.csv', index=False)
        
        # Create forecast plot
        visualizer = ElectricityVisualizer()
        fig = visualizer.plot_forecast_comparison(
            current_model.train_data.iloc[-168:],
            current_model.test_data.iloc[:min(168, len(current_model.test_data))],
            forecast,
            conf_int,
            title=f"{steps}-Hour Electricity Consumption Forecast"
        )
        fig.savefig('static/future_forecast.png', bbox_inches='tight', dpi=150)
        
        response = {
            'success': True,
            'message': f'Forecast generated for next {steps} hours',
            'forecast_data': forecast_df.head(24).to_dict('records'),  # First 24 hours
            'forecast_stats': {
                'mean': float(forecast.mean()),
                'min': float(forecast.min()),
                'max': float(forecast.max()),
                'std': float(forecast.std())
            },
            'plot': '/static/future_forecast.png',
            'download_url': '/download_forecast'
        }
        
        return jsonify(response)
        
    except Exception as e:
        return jsonify({'error': f'Error generating forecast: {str(e)}'}), 500

@app.route('/download_forecast')
def download_forecast():
    """Download forecast as CSV"""
    if current_forecast is None:
        return jsonify({'error': 'No forecast available'}), 400
    
    return send_file('outputs/web_forecast.csv', 
                    as_attachment=True, 
                    download_name='electricity_forecast.csv')

@app.route('/sample_data')
def get_sample_data():
    """Generate and return sample data for testing"""
    try:
        preprocessor = DataPreprocessor()
        data = preprocessor.generate_sample_data(start_date='2023-01-01', end_date='2023-12-31')
        
        # Save sample data
        sample_path = os.path.join(app.config['UPLOAD_FOLDER'], 'sample_data.csv')
        data.to_csv(sample_path, index=False)
        
        return jsonify({
            'success': True,
            'message': 'Sample data generated',
            'download_url': '/download_sample'
        })
        
    except Exception as e:
        return jsonify({'error': f'Error generating sample data: {str(e)}'}), 500

@app.route('/download_sample')
def download_sample():
    """Download sample CSV data"""
    return send_file('uploads/sample_data.csv', 
                    as_attachment=True, 
                    download_name='sample_electricity_data.csv')

@app.route('/health')
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'timestamp': datetime.now().isoformat()})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
