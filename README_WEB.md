# Electricity Power Forecasting Web Application

A modern web application for electricity power forecasting using SARIMA models with an intuitive interface for CSV file upload and real-time forecasting.

## 🌐 Web Application Features

### 🚀 Quick Start
```bash
# Install dependencies
npm run setup

# Start the web application
npm run dev

# The application will automatically open in your browser at http://localhost:5000
```

### 📋 Key Features

1. **CSV File Upload**
   - Drag & drop interface
   - File validation and preview
   - Sample data generation

2. **Interactive Model Configuration**
   - Adjustable SARIMA parameters
   - Real-time model training
   - Performance metrics

3. **Visual Analytics**
   - Time series plots
   - Seasonal pattern analysis
   - Forecast visualization
   - Performance charts

4. **Future Forecasting**
   - Customizable forecast horizon
   - Confidence intervals
   - CSV export functionality

## 🏗️ Web Application Architecture

```
Web Application Structure:
├── app.py                 # Flask web server and API endpoints
├── templates/
│   └── index.html         # Main web interface
├── static/               # Static files (images, CSS, JS)
├── uploads/              # Uploaded CSV files
├── package.json          # npm scripts and configuration
└── requirements.txt      # Python dependencies
```

## 🎯 How to Use the Web Application

### 1. Upload Data
- Click "Get Sample Data" to download a sample CSV file
- Or upload your own electricity consumption CSV file
- Required columns: `datetime`, `consumption_mw`

### 2. Configure Model
- Adjust SARIMA parameters (p,d,q) and seasonal parameters (P,D,Q,s)
- Default settings work well for hourly electricity data
- Click "Train Model" to start training

### 3. View Results
- Model performance metrics (RMSE, MAE, MAPE)
- Interactive visualizations
- Time series decomposition

### 4. Generate Forecasts
- Set forecast duration (hours)
- Click "Generate Forecast" for predictions
- Download results as CSV

## 🛠️ Development Commands

```bash
# Install all dependencies
npm run install-deps

# Start development server
npm run dev

# Start backend only
npm run dev:backend

# Production deployment
npm run start

# Clean temporary files
npm run clean
```

## 📊 API Endpoints

### Core Endpoints
- `GET /` - Main web interface
- `POST /upload` - Upload and process CSV files
- `POST /train_model` - Train SARIMA model
- `POST /forecast` - Generate forecasts
- `GET /download_forecast` - Download forecast CSV
- `GET /sample_data` - Generate sample data
- `GET /health` - Health check

### File Upload Requirements
- **Format**: CSV
- **Max Size**: 16MB
- **Required Columns**:
  - `datetime`: Timestamp (YYYY-MM-DD HH:MM:SS)
  - `consumption_mw`: Electricity consumption in megawatts

## 🎨 Frontend Features

### User Interface
- **Responsive Design**: Works on desktop and mobile
- **Modern UI**: Built with Tailwind CSS
- **Interactive Charts**: Real-time data visualization
- **Drag & Drop**: Easy file upload
- **Loading States**: User feedback during processing

### Visualizations
- Time series plots
- Seasonal pattern analysis
- Model performance charts
- Forecast confidence intervals
- Interactive data tables

## 🔧 Configuration

### SARIMA Model Parameters
- **Order (p,d,q)**: Non-seasonal parameters
  - p: Autoregressive order (0-5)
  - d: Differencing order (0-2)
  - q: Moving average order (0-5)
- **Seasonal Order (P,D,Q,s)**: Seasonal parameters
  - P: Seasonal AR order (0-2)
  - D: Seasonal differencing (0-2)
  - Q: Seasonal MA order (0-2)
  - s: Seasonal period (24 for hourly data)

### Default Settings
- Order: (1, 1, 1)
- Seasonal Order: (1, 1, 1, 24)
- These work well for hourly electricity consumption data

## 🚀 Deployment

### Local Development
```bash
# Clone the repository
git clone <repository-url>
cd electricity-power-forecasting

# Install dependencies
npm run setup

# Start the application
npm run dev
```

### Production Deployment
```bash
# Install production dependencies
pip install -r requirements.txt

# Start the Flask application
python app.py

# Or use a production server like Gunicorn
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

## 🔍 Troubleshooting

### Common Issues

1. **File Upload Fails**
   - Check file format (must be CSV)
   - Verify required columns exist
   - Ensure file size < 16MB

2. **Model Training Slow**
   - Reduce data size for testing
   - Use simpler SARIMA parameters
   - Check system resources

3. **Visualizations Not Loading**
   - Check browser console for errors
   - Ensure static files are accessible
   - Verify Flask server is running

### Error Messages
- **"No file provided"**: Select a CSV file before uploading
- **"Missing required columns"**: Ensure datetime and consumption_mw columns exist
- **"No trained model available"**: Train the model before generating forecasts

## 📈 Performance Optimization

### For Large Datasets
- Use data sampling for initial testing
- Implement data pagination
- Consider using Redis for caching
- Optimize SARIMA parameters

### Browser Compatibility
- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support
- Mobile browsers: Responsive design

## 🔒 Security Considerations

- File upload validation
- Input sanitization
- Error message sanitization
- Secure file handling
- CORS configuration

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

For issues and questions:
1. Check this documentation
2. Review the troubleshooting section
3. Create an issue with detailed information
4. Include error messages and system details

---

**Note**: This web application provides a user-friendly interface for electricity power forecasting. For advanced usage and customization, refer to the main project documentation.
