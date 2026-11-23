
import pandas as pd
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import seaborn as sns
import warnings
from pathlib import Path

warnings.filterwarnings('ignore')
sns.set_style('whitegrid')

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
DATA_XLSX = ROOT / "data" / "dataset.xlsx"
PLOTS_DIR = HERE / "eda_plots"
PLOTS_DIR.mkdir(exist_ok=True)

print("=" * 70)
print("DengueGuard BD — EDA")
print(f"Reading: {DATA_XLSX}")
print("=" * 70)

df = pd.read_excel(DATA_XLSX, sheet_name='Sheet1')
print(f"\n[1] Shape: {df.shape}")
print(df.head())

# ---- FIX: strip whitespace from column names FIRST ----
df.columns = df.columns.str.strip()
print(f"\nColumns after strip: {list(df.columns)}")

# ---- FIX: forward-fill Division AND Year (both have merged/NaN cells) ----
df['Division'] = df['Division'].ffill()
df['Year'] = df['Year'].ffill()
df['Year'] = pd.to_numeric(df['Year'], errors='coerce')
print(f"\n[3] Divisions:\n{df['Division'].value_counts()}")
print(f"Year range: {int(df['Year'].min())}–{int(df['Year'].max())}")

# ---- FIX: parse temp/pressure using the correct (stripped) column names ----
df['temp_c'] = df['temperature'].astype(str).str.extract(r'([\d.]+)').astype(float)
df['pressure_mbar'] = df['Pressure'].astype(str).str.extract(r'([\d.]+)').astype(float)

# 5. Infected / Death distributions
fig, axes = plt.subplots(1, 2, figsize=(14, 4))
sns.histplot(df['Infected'], bins=50, ax=axes[0]).set_title('Infected (raw)')
sns.histplot(np.log1p(df['Infected']), bins=50, ax=axes[1]).set_title('log1p(Infected)')
plt.tight_layout()
plt.savefig(PLOTS_DIR / "01_infected_dist.png", dpi=120)
plt.close()
print("\n[4] Infected/Death stats:")
print(df[['Infected', 'Death']].describe())

# 6. Class balance
print("\n[5] Risk class balance:")
print(df['Class'].value_counts())
plt.figure(figsize=(8, 4))
sns.countplot(data=df, x='Class', order=['Very Low', 'Low', 'Medium', 'High'])
plt.title('Risk Class balance')
plt.savefig(PLOTS_DIR / "02_class_balance.png", dpi=120)
plt.close()

# 7. Monthly seasonality
month_order = ['January', 'February', 'March', 'April', 'May', 'June',
               'July', 'August', 'September', 'October', 'November', 'December']
pivot = df.pivot_table(index='Month', columns='Division',
                       values='Infected', aggfunc='mean').reindex(month_order)
plt.figure(figsize=(14, 6))
pivot.plot(marker='o', ax=plt.gca())
plt.title('Mean monthly infected by division')
plt.xticks(rotation=45)
plt.tight_layout()
plt.savefig(PLOTS_DIR / "03_seasonality.png", dpi=120)
plt.close()

# 8. Yearly totals
yearly = df.groupby(['Year', 'Division'])['Infected'].sum().unstack()
plt.figure(figsize=(13, 5))
yearly.plot(kind='bar', stacked=True, ax=plt.gca())
plt.title('Total infected by year & division')
plt.tight_layout()
plt.savefig(PLOTS_DIR / "04_yearly.png", dpi=120)
plt.close()

# 9. Correlation
num_cols = ['Infected', 'Death', 'temp_c', 'Humidity', 'pressure_mbar']
corr = df[num_cols].corr()
plt.figure(figsize=(8, 6))
sns.heatmap(corr, annot=True, cmap='coolwarm', fmt='.2f')
plt.title('Correlation matrix')
plt.savefig(PLOTS_DIR / "05_correlation.png", dpi=120)
plt.close()
print("\n[6] Correlation matrix:")
print(corr)

# 10. Humidity vs Infected
plt.figure(figsize=(9, 5))
sns.scatterplot(data=df, x='Humidity', y='Infected', hue='Class', alpha=0.6)
plt.yscale('log')
plt.title('Humidity vs log(Infected)')
plt.savefig(PLOTS_DIR / "06_humidity.png", dpi=120)
plt.close()

# 11. Dhaka series
dhaka = df[df['Division'] == 'Dhaka'].copy()
dhaka['label'] = dhaka['Year'].astype(int).astype(str) + '-' + dhaka['Month'].str[:3]
plt.figure(figsize=(14, 4))
plt.plot(dhaka['label'], dhaka['Infected'], marker='o')
plt.xticks(rotation=90)
plt.title('Dhaka monthly infected')
plt.tight_layout()
plt.savefig(PLOTS_DIR / "07_dhaka_series.png", dpi=120)
plt.close()

print(f"\n[OK] EDA complete. Plots in {PLOTS_DIR}/")