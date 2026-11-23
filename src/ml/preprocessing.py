"""
preprocessing.py — Cleans dataset.xlsx and writes cleaned_dataset.csv
Run: python src/ml/preprocessing.py
"""
import pandas as pd
import numpy as np
import re
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
DATA_XLSX = ROOT / "data" / "dataset.xlsx"
OUT_CSV = HERE / "cleaned_dataset.csv"

print("=" * 70)
print("Preprocessing — DengueGuard BD")
print(f"Reading:  {DATA_XLSX}")
print(f"Writing:  {OUT_CSV}")
print("=" * 70)

df = pd.read_excel(DATA_XLSX, sheet_name='Sheet1')
print(f"Raw shape: {df.shape}")

# ---- FIX 1: strip whitespace from column names ----
df.columns = df.columns.str.strip()

# ---- FIX 2: forward-fill Division AND Year ----
df['Division'] = df['Division'].ffill().astype(str).str.strip()
df['Year'] = df['Year'].ffill()
df['Year'] = pd.to_numeric(df['Year'], errors='coerce').astype('Int64')

# 2. Month -> number
month_map = {'January': 1, 'February': 2, 'March': 3, 'April': 4, 'May': 5, 'June': 6,
             'July': 7, 'August': 8, 'September': 9, 'October': 10,
             'November': 11, 'December': 12}
df['MonthNum'] = df['Month'].astype(str).str.strip().map(month_map)

# 3. Robust numeric parsing
def parse_num(s):
    if pd.isna(s):
        return np.nan
    m = re.search(r'(-?\d+(?:\.\d+)?)', str(s))
    return float(m.group(1)) if m else np.nan

df['temp_c'] = df['temperature'].apply(parse_num)
df['pressure_mbar'] = df['Pressure'].apply(parse_num)
df['Humidity'] = pd.to_numeric(df['Humidity'], errors='coerce')
df['Infected'] = pd.to_numeric(df['Infected'], errors='coerce').fillna(0).astype(int)
df['Death'] = pd.to_numeric(df['Death'], errors='coerce').fillna(0).astype(int)

# 4. Ordinal encoding
ord_map = {'Very Low': 0, 'Low': 1, 'Medium': 2, 'High': 3, 'Very High': 4}
df['Pollution_ord'] = df['Pollution'].map(ord_map)
df['Density_ord'] = df['Density'].map(ord_map)
df['Class_ord'] = df['Class'].map(ord_map)

# 5. Drop unusable rows
before = len(df)
df = df.dropna(subset=['Year', 'MonthNum', 'temp_c', 'Humidity', 'pressure_mbar', 'Class_ord'])
df['Year'] = df['Year'].astype(int)
df['Infected'] = df['Infected'].clip(lower=0)
df['Death'] = df['Death'].clip(lower=0)
print(f"Dropped {before - len(df)} rows; kept {len(df)}")

# 6. Build date and sort
df['date'] = pd.to_datetime(dict(year=df['Year'], month=df['MonthNum'], day=1))
df = df.sort_values(['Division', 'date']).reset_index(drop=True)

# 7. Time-series features per division
for div in df['Division'].unique():
    idx = df[df['Division'] == div].index
    for lag in [1, 2, 3]:
        df.loc[idx, f'Infected_lag{lag}'] = df.loc[idx, 'Infected'].shift(lag)
        df.loc[idx, f'Death_lag{lag}'] = df.loc[idx, 'Death'].shift(lag)
    for w in [3, 6]:
        df.loc[idx, f'Infected_roll{w}'] = df.loc[idx, 'Infected'].rolling(w, min_periods=1).mean()
        df.loc[idx, f'Humidity_roll{w}'] = df.loc[idx, 'Humidity'].rolling(w, min_periods=1).mean()

df['month_sin'] = np.sin(2 * np.pi * df['MonthNum'] / 12)
df['month_cos'] = np.cos(2 * np.pi * df['MonthNum'] / 12)
df['is_monsoon'] = df['MonthNum'].isin([6, 7, 8, 9]).astype(int)
df['death_rate'] = (df['Death'] / df['Infected'].replace(0, np.nan)).fillna(0)
df['log_infected'] = np.log1p(df['Infected'])

# 8. Next-month targets
for div in df['Division'].unique():
    idx = df[df['Division'] == div].index
    df.loc[idx, 'target_next_infected'] = df.loc[idx, 'Infected'].shift(-1)
    df.loc[idx, 'target_next_death'] = df.loc[idx, 'Death'].shift(-1)
    df.loc[idx, 'target_next_class'] = df.loc[idx, 'Class_ord'].shift(-1)

df['target_trend_up'] = (df['target_next_infected'] > df['Infected']).astype(int)
df.loc[df['target_next_infected'].isna(), 'target_trend_up'] = np.nan

# 9. Save
out_cols = ['Division', 'Year', 'Month', 'MonthNum', 'date',
            'Pollution', 'Density', 'Class', 'Class_ord',
            'Pollution_ord', 'Density_ord', 'Infected', 'Death',
            'temp_c', 'Humidity', 'pressure_mbar',
            'Infected_lag1', 'Infected_lag2', 'Infected_lag3', 'Death_lag1',
            'Infected_roll3', 'Infected_roll6',
            'Humidity_roll3', 'Humidity_roll6',
            'month_sin', 'month_cos', 'is_monsoon', 'death_rate', 'log_infected',
            'target_next_infected', 'target_next_death', 'target_next_class', 'target_trend_up']

clean = df[out_cols].copy()
clean.to_csv(OUT_CSV, index=False)
print(f"\n[OK] Saved {OUT_CSV}  shape={clean.shape}")
print(clean.head())