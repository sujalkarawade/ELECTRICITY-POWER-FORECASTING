import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import warnings
warnings.filterwarnings('ignore')

class DataPreprocessor:
    def __init__(self):
        self.data = None
        self.processed_data = None
    
    def load_data(self, file_path):
        """Load electricity consumption data from CSV file"""
        try:
            self.data = pd.read_csv(file_path)
            print(f"Data loaded successfully. Shape: {self.data.shape}")
            return self.data
        except Exception as e:
            print(f"Error loading data: {e}")
            return None
    
    def generate_sample_data(self, start_date='2020-01-01', end_date='2023-12-31'):
        """Generate sample electricity consumption data for demonstration"""
        date_range = pd.date_range(start=start_date, end=end_date, freq='H')
        
        # Generate realistic electricity consumption patterns
        np.random.seed(42)
        base_consumption = 1000  # Base consumption in MW
        
        # Add daily seasonality (higher during day, lower at night)
        daily_pattern = 300 * np.sin(2 * np.pi * date_range.hour / 24) + 200
        
        # Add weekly seasonality (higher on weekdays)
        weekly_pattern = 150 * np.sin(2 * np.pi * date_range.dayofweek / 7)
        
        # Add yearly seasonality (higher in summer/winter)
        yearly_pattern = 200 * np.sin(2 * np.pi * date_range.dayofyear / 365)
        
        # Add trend (increasing consumption over time)
        trend = np.linspace(0, 100, len(date_range))
        
        # Add random noise
        noise = np.random.normal(0, 50, len(date_range))
        
        # Combine all components
        consumption = (base_consumption + daily_pattern + weekly_pattern + 
                      yearly_pattern + trend + noise)
        
        # Ensure positive values
        consumption = np.maximum(consumption, 100)
        
        self.data = pd.DataFrame({
            'datetime': date_range,
            'consumption_mw': consumption,
            'temperature': 20 + 15 * np.sin(2 * np.pi * date_range.dayofyear / 365) + np.random.normal(0, 3, len(date_range)),
            'hour': date_range.hour,
            'day_of_week': date_range.dayofweek,
            'month': date_range.month,
            'year': date_range.year
        })
        
        print(f"Sample data generated. Shape: {self.data.shape}")
        return self.data
    
    def clean_data(self):
        """Clean and preprocess the data"""
        if self.data is None:
            print("No data loaded. Please load data first.")
            return None
        
        # Make a copy to avoid modifying original data
        df = self.data.copy()
        
        # Convert datetime column to datetime type if it exists
        if 'datetime' in df.columns:
            df['datetime'] = pd.to_datetime(df['datetime'])
            df.set_index('datetime', inplace=True)
        
        # Handle missing values
        print(f"Missing values before cleaning:\n{df.isnull().sum()}")
        
        # Forward fill missing values
        df.fillna(method='ffill', inplace=True)
        
        # If still missing values, use backward fill
        df.fillna(method='bfill', inplace=True)
        
        # Remove outliers using IQR method
        if 'consumption_mw' in df.columns:
            Q1 = df['consumption_mw'].quantile(0.25)
            Q3 = df['consumption_mw'].quantile(0.75)
            IQR = Q3 - Q1
            lower_bound = Q1 - 1.5 * IQR
            upper_bound = Q3 + 1.5 * IQR
            
            # Cap outliers instead of removing them
            df['consumption_mw'] = df['consumption_mw'].clip(lower_bound, upper_bound)
        
        print(f"Missing values after cleaning:\n{df.isnull().sum()}")
        self.processed_data = df
        return df
    
    def add_features(self):
        """Add additional features for better modeling"""
        if self.processed_data is None:
            print("No processed data available. Please clean data first.")
            return None
        
        df = self.processed_data.copy()
        
        # Add lag features
        for lag in [1, 24, 168]:  # 1 hour, 1 day, 1 week
            df[f'consumption_lag_{lag}'] = df['consumption_mw'].shift(lag)
        
        # Add rolling statistics
        for window in [24, 168]:  # 1 day, 1 week
            df[f'consumption_rolling_mean_{window}'] = df['consumption_mw'].rolling(window=window).mean()
            df[f'consumption_rolling_std_{window}'] = df['consumption_mw'].rolling(window=window).std()
        
        # Add time-based features
        df['is_weekend'] = (df.index.dayofweek >= 5).astype(int)
        df['is_peak_hour'] = ((df.index.hour >= 8) & (df.index.hour <= 20)).astype(int)
        
        # Drop rows with NaN values created by lag features
        df.dropna(inplace=True)
        
        self.processed_data = df
        print(f"Features added. Final shape: {df.shape}")
        return df
    
    def split_data(self, test_size=0.2):
        """Split data into train and test sets"""
        if self.processed_data is None:
            print("No processed data available. Please process data first.")
            return None, None
        
        # For time series data, we should split chronologically
        split_point = int(len(self.processed_data) * (1 - test_size))
        
        train_data = self.processed_data.iloc[:split_point]
        test_data = self.processed_data.iloc[split_point:]
        
        print(f"Train set shape: {train_data.shape}")
        print(f"Test set shape: {test_data.shape}")
        print(f"Train period: {train_data.index.min()} to {train_data.index.max()}")
        print(f"Test period: {test_data.index.min()} to {test_data.index.max()}")
        
        return train_data, test_data
    
    def save_processed_data(self, file_path):
        """Save processed data to CSV"""
        if self.processed_data is not None:
            self.processed_data.to_csv(file_path)
            print(f"Processed data saved to {file_path}")
        else:
            print("No processed data to save.")

if __name__ == "__main__":
    # Example usage
    preprocessor = DataPreprocessor()
    
    # Generate sample data
    data = preprocessor.generate_sample_data()
    
    # Clean and preprocess
    cleaned_data = preprocessor.clean_data()
    
    # Add features
    featured_data = preprocessor.add_features()
    
    # Split data
    train_data, test_data = preprocessor.split_data()
    
    # Save processed data
    preprocessor.save_processed_data('data/processed_electricity_data.csv')
