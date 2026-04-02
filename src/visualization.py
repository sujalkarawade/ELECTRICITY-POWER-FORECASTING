import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots
import warnings
warnings.filterwarnings('ignore')

class ElectricityVisualizer:
    def __init__(self):
        # Set style for matplotlib
        plt.style.use('seaborn-v0_8')
        sns.set_palette("husl")
        
    def plot_time_series(self, data, column='consumption_mw', 
                        title="Electricity Consumption Over Time",
                        figsize=(15, 8)):
        """Plot basic time series data"""
        fig, ax = plt.subplots(figsize=figsize)
        
        ax.plot(data.index, data[column], linewidth=1, alpha=0.8)
        ax.set_title(title, fontsize=16, fontweight='bold')
        ax.set_xlabel('Date', fontsize=12)
        ax.set_ylabel('Electricity Consumption (MW)', fontsize=12)
        ax.grid(True, alpha=0.3)
        
        # Format x-axis
        plt.xticks(rotation=45)
        plt.tight_layout()
        
        return fig
    
    def plot_seasonal_patterns(self, data, column='consumption_mw'):
        """Plot seasonal patterns (hourly, daily, monthly)"""
        fig, axes = plt.subplots(2, 2, figsize=(15, 12))
        
        # Hourly pattern
        hourly_avg = data.groupby(data.index.hour)[column].mean()
        axes[0, 0].plot(hourly_avg.index, hourly_avg.values, marker='o')
        axes[0, 0].set_title('Average Hourly Consumption Pattern')
        axes[0, 0].set_xlabel('Hour of Day')
        axes[0, 0].set_ylabel('Consumption (MW)')
        axes[0, 0].grid(True, alpha=0.3)
        
        # Daily pattern
        daily_avg = data.groupby(data.index.dayofweek)[column].mean()
        day_names = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        axes[0, 1].bar(daily_avg.index, daily_avg.values)
        axes[0, 1].set_title('Average Daily Consumption Pattern')
        axes[0, 1].set_xlabel('Day of Week')
        axes[0, 1].set_ylabel('Consumption (MW)')
        axes[0, 1].set_xticks(daily_avg.index)
        axes[0, 1].set_xticklabels(day_names)
        axes[0, 1].grid(True, alpha=0.3)
        
        # Monthly pattern
        monthly_avg = data.groupby(data.index.month)[column].mean()
        month_names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        axes[1, 0].plot(monthly_avg.index, monthly_avg.values, marker='o')
        axes[1, 0].set_title('Average Monthly Consumption Pattern')
        axes[1, 0].set_xlabel('Month')
        axes[1, 0].set_ylabel('Consumption (MW)')
        axes[1, 0].set_xticks(monthly_avg.index)
        axes[1, 0].set_xticklabels(month_names)
        axes[1, 0].grid(True, alpha=0.3)
        
        # Heatmap of hourly consumption by day of week
        pivot_data = data.copy()
        pivot_data['hour'] = pivot_data.index.hour
        pivot_data['dayofweek'] = pivot_data.index.dayofweek
        
        heatmap_data = pivot_data.groupby(['dayofweek', 'hour'])[column].mean().unstack()
        
        sns.heatmap(heatmap_data, ax=axes[1, 1], cmap='YlOrRd', cbar_kws={'label': 'Consumption (MW)'})
        axes[1, 1].set_title('Hourly Consumption Heatmap by Day of Week')
        axes[1, 1].set_xlabel('Hour of Day')
        axes[1, 1].set_ylabel('Day of Week')
        axes[1, 1].set_yticklabels(day_names)
        
        plt.tight_layout()
        return fig
    
    def plot_decomposition(self, data, column='consumption_mw', period=24):
        """Plot seasonal decomposition"""
        from statsmodels.tsa.seasonal import seasonal_decompose
        
        decomposition = seasonal_decompose(data[column], model='additive', period=period)
        
        fig, axes = plt.subplots(4, 1, figsize=(15, 12))
        
        decomposition.observed.plot(ax=axes[0], title='Original Time Series')
        decomposition.trend.plot(ax=axes[1], title='Trend Component')
        decomposition.seasonal.plot(ax=axes[2], title='Seasonal Component')
        decomposition.resid.plot(ax=axes[3], title='Residual Component')
        
        for ax in axes:
            ax.set_xlabel('')
            ax.grid(True, alpha=0.3)
        
        plt.tight_layout()
        return fig
    
    def plot_forecast_comparison(self, train_data, test_data, forecast, 
                                confidence_interval=None, 
                                title="SARIMA Forecast vs Actual"):
        """Plot forecast against actual values with confidence intervals"""
        fig, ax = plt.subplots(figsize=(15, 8))
        
        # Plot training data
        ax.plot(train_data.index, train_data['consumption_mw'], 
               label='Training Data', color='blue', alpha=0.7, linewidth=1)
        
        # Plot actual test data
        ax.plot(test_data.index, test_data['consumption_mw'], 
               label='Actual Test Data', color='green', alpha=0.8, linewidth=1.5)
        
        # Plot forecast
        ax.plot(forecast.index, forecast, 
               label='Forecast', color='red', linewidth=2)
        
        # Plot confidence intervals if available
        if confidence_interval is not None:
            ax.fill_between(confidence_interval.index, 
                           confidence_interval.iloc[:, 0], 
                           confidence_interval.iloc[:, 1], 
                           color='red', alpha=0.2, label='95% Confidence Interval')
        
        ax.set_title(title, fontsize=16, fontweight='bold')
        ax.set_xlabel('Date', fontsize=12)
        ax.set_ylabel('Electricity Consumption (MW)', fontsize=12)
        ax.legend(fontsize=10)
        ax.grid(True, alpha=0.3)
        
        # Format x-axis
        plt.xticks(rotation=45)
        plt.tight_layout()
        
        return fig
    
    def plot_residuals_analysis(self, residuals):
        """Plot residuals analysis for model diagnostics"""
        fig, axes = plt.subplots(2, 2, figsize=(15, 10))
        
        # Residuals time series
        axes[0, 0].plot(residuals.index, residuals.values, alpha=0.7)
        axes[0, 0].set_title('Residuals Time Series')
        axes[0, 0].set_xlabel('Date')
        axes[0, 0].set_ylabel('Residuals')
        axes[0, 0].grid(True, alpha=0.3)
        
        # Residuals histogram
        axes[0, 1].hist(residuals.values, bins=30, alpha=0.7, edgecolor='black')
        axes[0, 1].set_title('Residuals Distribution')
        axes[0, 1].set_xlabel('Residuals')
        axes[0, 1].set_ylabel('Frequency')
        axes[0, 1].grid(True, alpha=0.3)
        
        # Q-Q plot
        from scipy import stats
        stats.probplot(residuals.values, dist="norm", plot=axes[1, 0])
        axes[1, 0].set_title('Q-Q Plot')
        axes[1, 0].grid(True, alpha=0.3)
        
        # ACF of residuals
        from statsmodels.graphics.tsaplots import plot_acf
        plot_acf(residuals.values.dropna(), lags=40, ax=axes[1, 1])
        axes[1, 1].set_title('ACF of Residuals')
        axes[1, 1].grid(True, alpha=0.3)
        
        plt.tight_layout()
        return fig
    
    def create_interactive_plot(self, data, column='consumption_mw'):
        """Create interactive plot using Plotly"""
        fig = go.Figure()
        
        fig.add_trace(go.Scatter(
            x=data.index,
            y=data[column],
            mode='lines',
            name='Electricity Consumption',
            line=dict(color='blue', width=1)
        ))
        
        fig.update_layout(
            title='Interactive Electricity Consumption Time Series',
            xaxis_title='Date',
            yaxis_title='Consumption (MW)',
            hovermode='x unified',
            showlegend=True
        )
        
        return fig
    
    def create_interactive_forecast_plot(self, train_data, test_data, forecast, 
                                       confidence_interval=None):
        """Create interactive forecast plot using Plotly"""
        fig = go.Figure()
        
        # Training data
        fig.add_trace(go.Scatter(
            x=train_data.index,
            y=train_data['consumption_mw'],
            mode='lines',
            name='Training Data',
            line=dict(color='blue', width=1),
            opacity=0.7
        ))
        
        # Actual test data
        fig.add_trace(go.Scatter(
            x=test_data.index,
            y=test_data['consumption_mw'],
            mode='lines',
            name='Actual Test Data',
            line=dict(color='green', width=2)
        ))
        
        # Forecast
        fig.add_trace(go.Scatter(
            x=forecast.index,
            y=forecast,
            mode='lines',
            name='Forecast',
            line=dict(color='red', width=2)
        ))
        
        # Confidence intervals
        if confidence_interval is not None:
            fig.add_trace(go.Scatter(
                x=confidence_interval.index,
                y=confidence_interval.iloc[:, 1],
                mode='lines',
                line=dict(width=0),
                showlegend=False
            ))
            
            fig.add_trace(go.Scatter(
                x=confidence_interval.index,
                y=confidence_interval.iloc[:, 0],
                mode='lines',
                line=dict(width=0),
                fill='tonexty',
                fillcolor='rgba(255,0,0,0.2)',
                name='95% Confidence Interval'
            ))
        
        fig.update_layout(
            title='Interactive SARIMA Forecast',
            xaxis_title='Date',
            yaxis_title='Consumption (MW)',
            hovermode='x unified',
            showlegend=True
        )
        
        return fig
    
    def plot_model_performance_metrics(self, metrics_dict):
        """Plot model performance metrics"""
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 5))
        
        # Bar plot of error metrics
        metrics = ['RMSE', 'MAE', 'MAPE']
        values = [metrics_dict['rmse'], metrics_dict['mae'], metrics_dict['mape']]
        
        bars = ax1.bar(metrics, values, color=['skyblue', 'lightgreen', 'salmon'])
        ax1.set_title('Model Performance Metrics')
        ax1.set_ylabel('Error Value')
        
        # Add value labels on bars
        for bar, value in zip(bars, values):
            height = bar.get_height()
            ax1.text(bar.get_x() + bar.get_width()/2., height,
                    f'{value:.2f}', ha='center', va='bottom')
        
        # Actual vs Predicted scatter plot
        if 'forecast' in metrics_dict and 'actual' in metrics_dict:
            actual = metrics_dict['actual']
            predicted = metrics_dict['forecast']
            
            ax2.scatter(actual, predicted, alpha=0.6)
            ax2.plot([actual.min(), actual.max()], [actual.min(), actual.max()], 
                    'r--', lw=2)
            ax2.set_xlabel('Actual Values')
            ax2.set_ylabel('Predicted Values')
            ax2.set_title('Actual vs Predicted')
            ax2.grid(True, alpha=0.3)
        
        plt.tight_layout()
        return fig
    
    def save_plot(self, fig, filepath, dpi=300):
        """Save plot to file"""
        fig.savefig(filepath, dpi=dpi, bbox_inches='tight')
        print(f"Plot saved to {filepath}")

if __name__ == "__main__":
    # Example usage
    from data_preprocessing import DataPreprocessor
    
    # Load and preprocess data
    preprocessor = DataPreprocessor()
    data = preprocessor.generate_sample_data()
    cleaned_data = preprocessor.clean_data()
    
    # Initialize visualizer
    visualizer = ElectricityVisualizer()
    
    # Create various plots
    fig1 = visualizer.plot_time_series(cleaned_data)
    fig2 = visualizer.plot_seasonal_patterns(cleaned_data)
    fig3 = visualizer.plot_decomposition(cleaned_data)
    
    # Show plots
    plt.show()
    
    # Save plots
    visualizer.save_plot(fig1, 'outputs/time_series_plot.png')
    visualizer.save_plot(fig2, 'outputs/seasonal_patterns.png')
    visualizer.save_plot(fig3, 'outputs/decomposition.png')
