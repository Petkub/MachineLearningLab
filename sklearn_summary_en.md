# Scikit-learn Tutorial — Topics 1-4

> **PROMPT FOR CLAUDE CODE:**
> Please create a presentation slide deck (PowerPoint .pptx or HTML) from this content.
> - One slide per `##` heading (these are slide titles)
> - Use the tables and bullet points as-is
> - Keep code blocks short and readable
> - Use a clean, professional design (minimalist style)
> - Include section divider slides between major topics
> - Total: ~35-40 slides
> - Color theme suggestion: blue/teal for headers, white background

---

# 📊 Section 1: Introduction to Scikit-learn

---

## What is Scikit-learn?

- The most popular **Machine Learning library** in Python
- Born in **2007** from Google Summer of Code (David Cournapeau)
- Built on top of **NumPy, SciPy, matplotlib**
- Used for **traditional ML** (not deep learning)

**Installation:**
```bash
pip install scikit-learn
```

**Import:**
```python
import sklearn   # not "scikit-learn"
```

---

## 4 Design Philosophies

| # | Philosophy | Meaning |
|:---:|:---|:---|
| 1 | **Consistency** | All models use `.fit()`, `.predict()`, `.score()` the same way |
| 2 | **Inspection** | Learned values stored in attributes ending with `_` (e.g., `model.coef_`) |
| 3 | **Non-proliferation** | Uses standard NumPy/Pandas — no custom classes required |
| 4 | **Composition** | Everything chains together via Pipeline |

---

## Supervised vs Unsupervised Learning

| Type | Description | Example |
|:---|:---|:---|
| **Supervised** | Has labeled answers | Predict house prices (you know the price) |
| **Unsupervised** | No labels, find patterns | Customer segmentation (unknown groups) |

---

## Classification vs Regression (both Supervised)

| Type | Predicts | Examples |
|:---|:---|:---|
| **Classification** | Category | Spam/Not-spam, Dog/Cat/Bird |
| **Regression** | Continuous number | House price, Temperature, Sales |

---

## Features (X) and Target (y)

| Variable | Meaning | Example |
|:---:|:---|:---|
| **X** | Features (input variables) | House size, # rooms |
| **y** | Target (what to predict) | House price |

**Conventions:**
- `X` is **uppercase** → 2D matrix
- `y` is **lowercase** → 1D vector

---

## ML Workflow — 7 Steps

```
1. Load data
2. Separate X and y
3. train_test_split
4. Create model
5. .fit(X_train, y_train)
6. .predict(X_test)
7. .score(X_test, y_test)
```

These 7 steps work for **every model** in sklearn.

---

## train_test_split

```python
from sklearn.model_selection import train_test_split

X_train, X_test, y_train, y_test = train_test_split(
    X, y,
    test_size=0.2,        # 20% as test
    random_state=42,      # seed for reproducibility
    stratify=y            # preserve class ratio (classification only)
)
```

**Key parameters:**

| Parameter | Purpose |
|:---|:---|
| `test_size` | Test set proportion (e.g., 0.2 = 20%) |
| `random_state` | Random seed — same seed = same result |
| `stratify` | Preserve class ratio (classification) |
| `shuffle` | Shuffle before split (default: True) |

---

## When to use `stratify`

| Task | Use `stratify`? |
|:---|:---:|
| Classification | ✅ Always |
| Imbalanced classification | ✅ **Critical** |
| Regression | ❌ Never |

**Why?** Without stratify, you might get test data with very different class distribution than training data.

---

## Hello World Example

```python
from sklearn.datasets import load_iris
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression

# 1. Load data
data = load_iris()
X, y = data.data, data.target

# 2. Split
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

# 3. Train
model = LogisticRegression(max_iter=1000)
model.fit(X_train, y_train)

# 4. Evaluate
print(f"Accuracy: {model.score(X_test, y_test):.2%}")
```

---

# 🔧 Section 2: Data Preprocessing

---

## Why Preprocess?

Three main problems with raw data:

| Problem | Impact | Solution |
|:---|:---|:---|
| **Missing values (NaN)** | Model errors immediately | `SimpleImputer` |
| **Text/categorical data** | Models only accept numbers | `OneHotEncoder` |
| **Different number scales** | Large features dominate small ones | `StandardScaler` |

---

## The fit/transform Pattern

Every preprocessing tool uses the same pattern:

```python
tool = SomeTool()              # 1. Create
tool.fit(train_data)           # 2. Learn statistics
tool.transform(train_data)     # 3. Apply transformation
```

**Shortcut:**
```python
tool.fit_transform(train_data)   # Steps 2+3 in one call
```

---

## Golden Rule: fit only on train!

| Data | Use this |
|:---|:---|
| **Train** | `.fit_transform()` (learn + transform) |
| **Test** | `.transform()` only (never refit!) |

**Why never refit on test?**
- Test data simulates "unseen future data"
- If tool sees test during fit → data leakage
- Results become unrealistically good

---

## StandardScaler — Scaling Numbers

**Formula:** `x_new = (x - mean) / std`

Transforms data so:
- mean = 0
- std = 1

```python
from sklearn.preprocessing import StandardScaler

scaler = StandardScaler()
scaler.fit(data)
print(f"mean: {scaler.mean_}")
print(f"std:  {scaler.scale_}")

data_scaled = scaler.transform(data)
```

---

## StandardScaler — Before/After Example

**Input:** `[10, 20, 30, 40, 50]`
**Learned:** mean=30, std=14.14

| Original | Calculation | Scaled | Meaning |
|:---:|:---:|:---:|:---|
| 10 | (10-30)/14.14 | -1.41 | Lowest in group |
| 20 | (20-30)/14.14 | -0.71 | Below average |
| 30 | (30-30)/14.14 | 0.00 | = average |
| 40 | (40-30)/14.14 | +0.71 | Above average |
| 50 | (50-30)/14.14 | +1.41 | Highest in group |

---

## Which Models Need Scaling?

| Model | Scale needed? |
|:---|:---:|
| KNN | ✅ Yes (uses distance) |
| SVM | ✅ Yes (uses distance) |
| Neural Network | ✅ Yes |
| Linear/Logistic Regression | 🟡 Helps (faster convergence) |
| Decision Tree | ❌ Not needed |
| Random Forest | ❌ Not needed |

**Rule:** If the model uses distance or multiplication → scale it!

---

## OneHotEncoder — Encoding Text

Converts categorical column into multiple 0/1 columns.

**Before:**

| city |
|:---:|
| Bangkok |
| Phuket |
| Chiang Mai |

**After OneHot:**

| city_Bangkok | city_Chiang Mai | city_Phuket |
|:---:|:---:|:---:|
| 1 | 0 | 0 |
| 0 | 0 | 1 |
| 0 | 1 | 0 |

---

## OneHotEncoder — Code Example

```python
from sklearn.preprocessing import OneHotEncoder
import pandas as pd

data = pd.DataFrame({'city': ['Bangkok', 'Phuket', 'Chiang Mai']})

encoder = OneHotEncoder(sparse_output=False)
data_encoded = encoder.fit_transform(data)

print(encoder.get_feature_names_out())
# ['city_Bangkok' 'city_Chiang Mai' 'city_Phuket']
```

**Important parameters:**
- `sparse_output=False` → readable array output
- `handle_unknown='ignore'` → handle new categories in test

---

## OneHot vs Ordinal — Which to Use?

| Data Type | Use | Why |
|:---|:---|:---|
| Cities, colors, animals | **OneHot** | No inherent order |
| Sizes (S/M/L), Education (BS/MS/PhD) | **Ordinal** | Has order |

**Wrong choice = wrong model assumptions!**

---

## SimpleImputer — Filling Missing Values

**Strategies:**

| Strategy | Fills with | Use for |
|:---|:---|:---|
| `'mean'` | Average | Numbers, normal distribution |
| `'median'` | Middle value | Numbers, has outliers |
| `'most_frequent'` | Most common | Text or numbers |
| `'constant'` | Custom value | Set `fill_value=...` |

---

## SimpleImputer — Example

```python
from sklearn.impute import SimpleImputer
import numpy as np

data = [[25], [30], [np.nan], [45], [np.nan]]

imputer = SimpleImputer(strategy='median')
data_filled = imputer.fit_transform(data)
print(imputer.statistics_)   # [30.]
```

**Result:**

| Before | After |
|:---:|:---:|
| 25 | 25 |
| 30 | 30 |
| NaN | **30** ← filled |
| 45 | 45 |
| NaN | **30** ← filled |

---

## mean vs median — When Outliers Exist

```python
data = [10, 20, 30, 40, 1000]   # 1000 is outlier
```

| Strategy | Value | Reasonable? |
|:---|:---:|:---:|
| mean | 220 | ❌ Skewed by outlier |
| median | 30 | ✅ Robust |

**Rule:** With outliers → use **median**

---

## Summary: Numeric vs Categorical Pipeline

```
NUMERIC (Age, Salary)
    ↓
SimpleImputer(strategy='median')
    ↓
StandardScaler
    ↓
Ready for model

CATEGORICAL (Sex, City)
    ↓
SimpleImputer(strategy='most_frequent')
    ↓
OneHotEncoder
    ↓
Ready for model
```

---

## Tool Comparison

| Tool | `.fit()` learns | `.transform()` does |
|:---|:---|:---|
| `SimpleImputer('median')` | Column median | Replaces NaN with median |
| `SimpleImputer('most_frequent')` | Most common value | Replaces NaN with that value |
| `StandardScaler` | mean, std | Computes `(x - mean) / std` |
| `OneHotEncoder` | All categories | Splits into 0/1 columns |

---

# 🔗 Section 3: Pipeline

---

## Why Use Pipeline?

**Without Pipeline** (repetitive, error-prone):

```python
# Train
X_train_num = scaler.fit_transform(imputer.fit_transform(X_train[num]))
X_train_cat = ohe.fit_transform(cat_imp.fit_transform(X_train[cat]))
X_train_final = np.hstack([X_train_num, X_train_cat])

# Test (must duplicate!)
X_test_num = scaler.transform(imputer.transform(X_test[num]))
X_test_cat = ohe.transform(cat_imp.transform(X_test[cat]))
X_test_final = np.hstack([X_test_num, X_test_cat])
```

**Problems:** Long, error-prone, easy to leak data

---

## Pipeline — Basic Syntax

```python
from sklearn.pipeline import Pipeline

pipeline = Pipeline([
    ('step1_name', tool_1),
    ('step2_name', tool_2),
    ('step3_name', tool_3)
])

pipeline.fit(X_train, y_train)
pipeline.score(X_test, y_test)
```

**One call does everything!**

---

## Pipeline — Simple Example

```python
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression

pipeline = Pipeline([
    ('imputer', SimpleImputer(strategy='median')),
    ('scaler', StandardScaler()),
    ('model', LogisticRegression())
])

pipeline.fit(X_train, y_train)
pipeline.score(X_test, y_test)
```

**Result:** Same as 13 lines of manual code, but in 5 lines.

---

## Step Naming Rules

| Rule | Example |
|:---|:---|
| ✅ Any name works | `'imputer'`, `'step1'`, `'preprocess'` |
| ❌ No duplicate names | `('a', ...), ('a', ...)` invalid |
| ❌ No `__` (double underscore) | `'my__step'` invalid |

> Double underscore is reserved for accessing parameters (e.g., `'model__C'`)

---

## ColumnTransformer — Different Tools for Different Columns

When some columns are numeric and some are text, use `ColumnTransformer`:

```python
from sklearn.compose import ColumnTransformer

preprocessor = ColumnTransformer([
    ('num', num_pipeline, ['Age', 'Fare']),
    ('cat', cat_pipeline, ['Sex', 'Embarked'])
])
```

**Structure:** `(name, pipeline, column_list)`

---

## Full Pipeline Example — Titanic

```python
num_pipeline = Pipeline([
    ('imputer', SimpleImputer(strategy='median')),
    ('scaler', StandardScaler())
])

cat_pipeline = Pipeline([
    ('imputer', SimpleImputer(strategy='most_frequent')),
    ('ohe', OneHotEncoder(handle_unknown='ignore'))
])

preprocessor = ColumnTransformer([
    ('num', num_pipeline, ['Age', 'Fare', 'SibSp', 'Parch', 'Pclass']),
    ('cat', cat_pipeline, ['Sex', 'Embarked'])
])

full_pipeline = Pipeline([
    ('preprocessor', preprocessor),
    ('model', LogisticRegression(max_iter=1000))
])

full_pipeline.fit(X_train, y_train)
```

---

## Pipeline Shortcut: make_pipeline

If you don't want to name steps:

```python
from sklearn.pipeline import make_pipeline

pipeline = make_pipeline(
    SimpleImputer(),
    StandardScaler(),
    LogisticRegression()
)
```

sklearn auto-names: `'simpleimputer'`, `'standardscaler'`, `'logisticregression'`

---

## Pipeline Benefits

| Benefit | Description |
|:---|:---|
| **Concise code** | 13 lines → 5 lines |
| **Prevents data leakage** | Auto-uses `transform()` on test |
| **Single deployable unit** | Send to production as-is |
| **Easy model switching** | Change one line |
| **Works with GridSearchCV** | (Future topic) |

---

# 📈 Section 4: Regression

---

## What is Regression?

Regression predicts **continuous numbers**.

| Problem | Predicted Value |
|:---|:---:|
| Predict house price | 3,200,000 baht |
| Predict tomorrow's temperature | 28.5°C |
| Predict monthly sales | 1,250,000 baht |
| Predict customer spending | 4,500 baht |

---

## Regression vs Classification

| | Regression | Classification |
|:---|:---|:---|
| Predicts | Numbers | Categories |
| Example output | 3,200,000 baht | "Spam" / "Not spam" |
| Metric | R², MAE, RMSE | Accuracy, F1, Precision |
| Use stratify? | ❌ No | ✅ Yes |

---

## Linear Regression — Concept

Finds the **best-fit straight line** through data points.

**Example:** Hours studied → Test score

| Hours | Score |
|:---:|:---:|
| 1 | 35 |
| 2 | 42 |
| 3 | 50 |
| 4 | 55 |
| 5 | 60 |

Model learns equation: **`Score = 6.30 × Hours + 29.50`**

---

## Linear Regression — Basic Code

```python
from sklearn.linear_model import LinearRegression
import numpy as np

X = np.array([[1], [2], [3], [4], [5]])
y = np.array([35, 42, 50, 55, 60])

model = LinearRegression()
model.fit(X, y)

print(f"Slope: {model.coef_[0]:.2f}")        # 6.30
print(f"Intercept: {model.intercept_:.2f}")  # 29.50

print(model.predict([[6]]))   # [67.30]
```

---

## Key Attributes (end with `_`)

| Attribute | Description |
|:---|:---|
| `model.coef_` | Slope for each feature |
| `model.intercept_` | Y-axis intercept |

These are populated **after** calling `.fit()`.

---

## Regression Metrics

| Metric | Formula | Meaning |
|:---|:---|:---|
| **MAE** | mean(\|y - ŷ\|) | Average absolute error |
| **MSE** | mean((y - ŷ)²) | Mean squared error |
| **RMSE** | √MSE | Same unit as y |
| **R²** | 1 - SS_res/SS_tot | Variance explained (0-1) |

---

## R² Score — Interpretation

| R² | Meaning |
|:---:|:---|
| 1.00 | Perfect predictions |
| 0.80 | Explains 80% of variance (great) |
| 0.60 | Explains 60% (decent) |
| 0.00 | No better than predicting mean |
| Negative | Worse than predicting mean (something's wrong) |

```python
model.score(X_test, y_test)   # returns R²
```

---

## Full Regression Example — California Housing

```python
from sklearn.datasets import fetch_california_housing
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LinearRegression
from sklearn.metrics import r2_score, mean_absolute_error
import numpy as np

data = fetch_california_housing(as_frame=True)
X, y = data.data, data.target

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

pipeline = Pipeline([
    ('scaler', StandardScaler()),
    ('model', LinearRegression())
])

pipeline.fit(X_train, y_train)
y_pred = pipeline.predict(X_test)

print(f"R²:  {r2_score(y_test, y_pred):.4f}")
print(f"MAE: {mean_absolute_error(y_test, y_pred):.4f}")
```

---

## Other Regression Models

| Model | Use When |
|:---|:---|
| `LinearRegression` | Baseline |
| `Ridge` | Prevent overfitting (L2 regularization) |
| `Lasso` | Auto-feature selection (L1 regularization) |
| `ElasticNet` | Combines Ridge + Lasso |

**Interchangeable** — same interface:
```python
model = Ridge(alpha=1.0)
model.fit(X_train, y_train)
```

---

# ⚠️ Section 5: Common Pitfalls

---

## Pitfall 1: Preprocessing Before Train/Test Split

```python
# ❌ WRONG
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)   # sees all data!
X_train, X_test = train_test_split(X_scaled, ...)
```

```python
# ✅ CORRECT
X_train, X_test = train_test_split(X, ...)
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)
```

**Why it matters:** Data leakage makes results look better than they are.

---

## Pitfall 2: Calling fit_transform on Test Data

```python
# ❌ WRONG
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.fit_transform(X_test)   # refit!
```

```python
# ✅ CORRECT
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)   # transform only
```

**Why it matters:** Train and test get scaled differently → predictions break.

---

## Pitfall 3: Forgetting stratify in Classification

```python
# ❌ RISKY
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)
```

```python
# ✅ BETTER
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)
```

**Why it matters:** Imbalanced classes might end up missing entirely from test set.

---

## Pitfall 4: OneHot on Ordinal Data

```python
# ❌ WRONG: size has order S < M < L
df['size'] = ['S', 'M', 'L']
ohe.fit_transform(df[['size']])   # loses order info
```

```python
# ✅ CORRECT
from sklearn.preprocessing import OrdinalEncoder
encoder = OrdinalEncoder(categories=[['S', 'M', 'L']])
encoder.fit_transform(df[['size']])   # S=0, M=1, L=2
```

---

## Pitfall 5: Ordinal on Non-Ordinal Data

```python
# ❌ WRONG: cities have no order
df['city'] = ['Bangkok', 'Phuket', 'Chiang Mai']
OrdinalEncoder().fit_transform(df[['city']])
# Model thinks Phuket > Chiang Mai > Bangkok
```

```python
# ✅ CORRECT
OneHotEncoder(sparse_output=False).fit_transform(df[['city']])
```

---

## Pitfall 6: Forgetting random_state

```python
# ❌ Results change every run
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)
```

```python
# ✅ Reproducible
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)
```

**Why it matters:** Without it, you can't reproduce results or compare models fairly.

---

## Pitfall 7: Using Accuracy for Regression

```python
# ❌ WRONG
model = LinearRegression()
model.fit(X_train, y_train)
print(f"Accuracy: {model.score(X_test, y_test):.2%}")
# .score() returns R², not accuracy! R² can be negative.
```

```python
# ✅ CORRECT
from sklearn.metrics import r2_score, mean_absolute_error
y_pred = model.predict(X_test)
print(f"R²:  {r2_score(y_test, y_pred):.4f}")
print(f"MAE: {mean_absolute_error(y_test, y_pred):.4f}")
```

---

## Pitfall 8: Not Handling NaN

```python
# ❌ WRONG
df['age'] = [25, 30, np.nan, 45]
model.fit(df, y)   # ValueError: Input contains NaN!
```

```python
# ✅ CORRECT
imputer = SimpleImputer(strategy='median')
df_filled = imputer.fit_transform(df)
model.fit(df_filled, y)
```

---

## Pitfall 9: X Shape is 1D

```python
# ❌ WRONG
X = [1, 2, 3, 4, 5]   # 1D
model.fit(X, y)   # Error: Reshape your data!
```

```python
# ✅ CORRECT
X = [[1], [2], [3], [4], [5]]   # 2D
# or
import numpy as np
X = np.array([1, 2, 3, 4, 5]).reshape(-1, 1)
```

**Rule:** X must be 2D (matrix), y must be 1D (vector).

---

## Pitfall 10: Forgetting to Scale Test Data

```python
# ❌ WRONG
X_train_scaled = scaler.fit_transform(X_train)
model.fit(X_train_scaled, y_train)
predictions = model.predict(X_test)   # raw test data!
```

```python
# ✅ CORRECT (or use Pipeline!)
X_test_scaled = scaler.transform(X_test)
predictions = model.predict(X_test_scaled)
```

**Best practice:** Use Pipeline to never forget.

---

## Pitfall 11: OneHotEncoder Without handle_unknown

```python
# ❌ RISKY
ohe = OneHotEncoder(sparse_output=False)
ohe.fit(X_train[['city']])   # train: Bangkok, Phuket
ohe.transform(X_test)   # Error if test has new city!
```

```python
# ✅ SAFE
ohe = OneHotEncoder(sparse_output=False, handle_unknown='ignore')
```

---

## Pitfall 12: LogisticRegression Convergence Warning

```python
# ❌ Default max_iter=100 may not converge
model = LogisticRegression()
# Warning: ConvergenceWarning
```

```python
# ✅ Use larger max_iter
model = LogisticRegression(max_iter=1000)
```

---

## Pitfalls Summary

| # | Pitfall | Prevention |
|:---:|:---|:---|
| 1 | Preprocess before split | Split first, always |
| 2 | fit_transform on test | Use `.transform()` only |
| 3 | Forget stratify | Use for all classification |
| 4 | OneHot on ordinal | Use OrdinalEncoder |
| 5 | Ordinal on non-ordinal | Use OneHotEncoder |
| 6 | No random_state | Always set seed |
| 7 | Accuracy for regression | Use R²/MAE |
| 8 | Ignore NaN | Use SimpleImputer |
| 9 | X is 1D | Use `[[]]` or reshape |
| 10 | Forget scale on test | Use Pipeline |
| 11 | No handle_unknown | Set `handle_unknown='ignore'` |
| 12 | Convergence warning | Set `max_iter=1000` |

---

# 📝 Section 6: Code Templates

---

## Classification Template

```python
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.linear_model import LogisticRegression

df = pd.read_csv('data.csv')
y = df['target']
X = df.drop(columns='target')

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

num_cols = ['col1', 'col2']
cat_cols = ['col3', 'col4']

num_pipeline = Pipeline([
    ('imputer', SimpleImputer(strategy='median')),
    ('scaler', StandardScaler())
])

cat_pipeline = Pipeline([
    ('imputer', SimpleImputer(strategy='most_frequent')),
    ('ohe', OneHotEncoder(handle_unknown='ignore'))
])

preprocessor = ColumnTransformer([
    ('num', num_pipeline, num_cols),
    ('cat', cat_pipeline, cat_cols)
])

full_pipeline = Pipeline([
    ('preprocessor', preprocessor),
    ('model', LogisticRegression(max_iter=1000))
])

full_pipeline.fit(X_train, y_train)
print(f"Accuracy: {full_pipeline.score(X_test, y_test):.2%}")
```

---

## Regression Template

```python
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.linear_model import LinearRegression
from sklearn.metrics import r2_score, mean_absolute_error, mean_squared_error

df = pd.read_csv('data.csv')
y = df['target']
X = df.drop(columns='target')

# No stratify for regression
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# [Same pipeline structure as classification]

full_pipeline = Pipeline([
    ('preprocessor', preprocessor),
    ('model', LinearRegression())
])

full_pipeline.fit(X_train, y_train)
y_pred = full_pipeline.predict(X_test)

print(f"R²:   {r2_score(y_test, y_pred):.4f}")
print(f"MAE:  {mean_absolute_error(y_test, y_pred):.4f}")
print(f"RMSE: {np.sqrt(mean_squared_error(y_test, y_pred)):.4f}")
```

---

## Quick Reference: Common Imports

```python
# Data
import pandas as pd
import numpy as np

# Splitting
from sklearn.model_selection import train_test_split

# Preprocessing
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler, OneHotEncoder, OrdinalEncoder

# Pipeline
from sklearn.pipeline import Pipeline, make_pipeline
from sklearn.compose import ColumnTransformer

# Classification models
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.neighbors import KNeighborsClassifier

# Regression models
from sklearn.linear_model import LinearRegression, Ridge, Lasso
from sklearn.ensemble import RandomForestRegressor

# Metrics
from sklearn.metrics import accuracy_score, confusion_matrix
from sklearn.metrics import r2_score, mean_absolute_error, mean_squared_error
```

---

## Built-in Datasets

```python
# Small (instant load)
from sklearn.datasets import load_iris, load_wine, load_breast_cancer
from sklearn.datasets import load_diabetes, fetch_california_housing

# From OpenML (network required)
from sklearn.datasets import fetch_openml
titanic = fetch_openml('titanic', version=1, as_frame=True)
```

---

# 🎓 Conclusion

---

## What You've Learned

| Topic | Key Takeaway |
|:---|:---|
| **1. Intro** | sklearn uses consistent `.fit()`, `.predict()` interface |
| **2. Preprocessing** | Scaler, OneHot, Imputer — all follow fit/transform |
| **3. Pipeline** | Chains everything into clean, leak-proof code |
| **4. Regression** | Predict continuous values with R²/MAE/RMSE |

---

## What's Next

| Topic | What You'll Learn |
|:---|:---|
| **5. Classification Models** | KNN, Decision Tree, SVM, Random Forest |
| **6. Evaluation Metrics** | Precision, Recall, F1, Confusion Matrix |
| **7. Cross-Validation** | More reliable than single train/test split |
| **8. Hyperparameter Tuning** | GridSearchCV — auto-find best params |

---

## Thank You! 🚀

**Practice Tip:** Try the templates with your own dataset on Kaggle!

Recommended datasets:
- Titanic (beginner)
- House Prices (regression)
- Heart Disease (classification)
- Customer Churn (real-world)

**Happy Learning!**
