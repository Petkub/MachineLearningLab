# NOAI Thailand — Stage 2 Pre-Camp Bootcamp Plan

**Target:** High school students preparing for NOAI Thailand Stage 2 (National Team Selection / AI Training Camp)
**Format:** 4 days × 1.5 hours = 6 hours total
**Goal:** Survival-focused — students must be able to follow along in the official camp without getting lost

---

## 1. Executive Summary

### 1.1. Student Profile (assumed)
- Can write basic Python (variables, loops, functions, conditionals)
- **Has never used** NumPy, Pandas, scikit-learn, or PyTorch
- Has high school math background (algebra, basic statistics)
- Some conceptual exposure to AI from Stage 1 preparation

### 1.2. Bootcamp Goal
> **"Make students survive the official camp — keep up with mentors, read baseline notebooks confidently, and modify code without panicking."**

This is **NOT** a goal of:
- Winning the competition
- Mastering deep learning theory
- Building production ML systems

This **IS** a goal of:
- Reading and understanding camp notebooks
- Modifying baseline code (changing models, hyperparameters, features)
- Knowing what to ask when stuck
- Having a mental framework for AI tasks

### 1.3. Design Principles
1. **80/20 rule** — teach the 20% of content that handles 80% of camp tasks
2. **Pattern over theory** — give reusable code templates, not derivations
3. **Run first, understand later** — students execute working code before deep explanation
4. **Real tasks from day one** — use actual NOAI/IOAI past problems as examples
5. **Fine-tune > build from scratch** — 95% of Olympiad tasks use pre-trained models

### 1.4. What is INTENTIONALLY Excluded (and why)
| Topic | Why excluded |
|---|---|
| Deep NLP (BERT internals, tokenizers) | Too complex for 1.5 hours; covered in camp |
| Building CNNs from scratch | Transfer learning makes this unnecessary in practice |
| LLM fine-tuning, prompt engineering | Variable across years; not core survival skill |
| OpenCV detailed APIs | Used in <20% of recent IOAI tasks |
| Math derivations (gradient descent, backprop) | Conceptual understanding sufficient at this stage |
| Model deployment, MLOps | Out of scope for Olympiad |

---

## 2. Reference Tasks Used as Inspiration

The plan is calibrated against **real tasks** from IOAI and national selection events. All sourced from [IOAI Official Resources](https://ioai-official.org/resources/).

| Source | Task | Type | Skill highlighted |
|---|---|---|---|
| NOAI China 2024 | Basketball Shooting | Tabular | Pandas + sklearn |
| NOAI China 2024 | News Text Classification | NLP | Text preprocessing + classification |
| NOAI China 2024 | Real or Fake Image | CV | Image classification |
| Malaysia IOAI TSP 2025 | ResNet fine-tuning | CV | Transfer learning |
| Malaysia IOAI TSP 2025 | FCN segmentation | CV | Deeper PyTorch |
| Kazakhstan TST 2025 | Player Clustering | ML | Unsupervised learning |
| NEOAI 2025 | Tricy Table | ML | Feature engineering |

**Common pattern across all:** dataset + baseline notebook + scoring metric → improve the score. The bootcamp is built around this exact pattern.

---

## 3. Curriculum Map (4 days at a glance)

| Day | Topic | Tools | Survival Skill |
|---|---|---|---|
| **Day 1** | Data foundation | NumPy, Pandas | Load + explore + clean any CSV |
| **Day 2** | Classical ML | Matplotlib, scikit-learn | Train at least one ML model end-to-end |
| **Day 3** | Deep learning core | PyTorch | Read and modify a training loop |
| **Day 4** | Transfer learning + race day | torchvision | Fine-tune a pre-trained model + survive race day |

---

## 4. Day-by-Day Detailed Plan

---

### Day 1 — NumPy + Pandas Foundation

**Duration:** 90 minutes
**Goal:** Take any CSV file → explore it → clean it → produce a usable DataFrame

#### 4.1.1. Schedule

| Time | Block | Activity |
|---|---|---|
| 0:00–0:10 | Welcome + show real task | Open NOAI China 2024 Basketball Shooting; show students what an actual problem looks like (train.csv, test.csv, sample_submission.csv) |
| 0:10–0:35 | NumPy essentials | Live coding |
| 0:35–1:15 | Pandas essentials | Live coding |
| 1:15–1:30 | Mini-task | Students answer 5 questions about the Titanic dataset using code |

#### 4.1.2. NumPy Content (25 min)

Teach **only these**:
- Creation: `np.array([1,2,3])`, `np.zeros((3,3))`, `np.arange(10)`
- Shape and reshape: `arr.shape`, `arr.reshape(2,3)`
- Indexing/slicing: `arr[0]`, `arr[1:3]`, `arr[:, 0]`
- Aggregations: `arr.mean()`, `arr.sum()`, `arr.max()`, `arr.std()`
- Broadcasting (with diagram): `arr + 1`, `arr * 2`, `arr1 + arr2`

Skip: linear algebra functions, advanced random, complex axis manipulation.

#### 4.1.3. Pandas Content (40 min)

Teach **only these**:
- Loading: `pd.read_csv('file.csv')`
- Inspection: `df.head()`, `df.info()`, `df.describe()`, `df.shape`, `df.columns`
- Selection: `df['col']`, `df[['col1','col2']]`, `df.loc[0]`, `df.iloc[0:5]`
- Filtering: `df[df['age'] > 30]`, `df[df['sex'] == 'female']`
- Missing values: `df.isnull().sum()`, `df.fillna(value)`, `df.dropna()`
- Grouping: `df.groupby('col').mean()`, `df['col'].value_counts()`
- Adding columns: `df['new_col'] = df['col1'] + df['col2']`

Skip: multi-index, pivot_table, merge/join (defer to camp), advanced apply/lambda.

#### 4.1.4. Mini-Task: 5 Questions on Titanic

Give students `titanic.csv` and ask them to answer with code:
1. How many passengers are in the dataset?
2. What is the average age of passengers? (Handle missing values)
3. What percentage of passengers survived?
4. Did first-class passengers have a higher survival rate than third-class?
5. What was the average fare paid by survivors vs. non-survivors?

#### 4.1.5. Day 1 Survival Outcomes

After Day 1, a student should be able to:
- ✅ See `df.groupby('x').mean()` and understand what it does
- ✅ See `df.iloc[:, 1:]` and read it as "all rows, columns from index 1 onwards"
- ✅ Check for missing values in any dataset
- ✅ Filter rows by condition

---

### Day 2 — Matplotlib + scikit-learn ML Workflow

**Duration:** 90 minutes
**Goal:** From raw CSV → train a model → get accuracy → understand the full pipeline

#### 4.2.1. Schedule

| Time | Block | Activity |
|---|---|---|
| 0:00–0:15 | Matplotlib quick tour | 4 plot types only |
| 0:15–0:35 | The ML Pipeline (mantra) | Conceptual + diagram |
| 0:35–1:00 | scikit-learn workflow | Live coding the standard pattern |
| 1:00–1:30 | Hands-on | Train two models on Titanic, compare results |

#### 4.2.2. Matplotlib Content (15 min)

Teach **only these 4 plot types**:
- `plt.hist(df['age'])` — see distribution of one variable
- `plt.scatter(df['x'], df['y'])` — see relationship between two variables
- `df['col'].value_counts().plot.bar()` — see categorical distribution / class imbalance
- `plt.imshow(image_array)` — show an image (needed for Day 4)

Always end with `plt.show()`. Skip styling, subplots, seaborn.

#### 4.2.3. The ML Pipeline Mantra (20 min)

Teach this 5-step sequence as a mantra students can recite:

```
1. LOAD     →  pd.read_csv()
2. SPLIT    →  train_test_split(X, y)
3. FIT      →  model.fit(X_train, y_train)
4. PREDICT  →  preds = model.predict(X_test)
5. EVALUATE →  accuracy_score(y_test, preds)
```

Concepts to explain conceptually (no math):
- Why do we split? (To estimate generalization)
- What is train/validation/test? (Train to learn, val to tune, test to report)
- Features (X) vs. labels (y)

#### 4.2.4. scikit-learn Pattern (25 min)

The **universal sklearn pattern** — every model in sklearn uses this:

```python
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, confusion_matrix

# Step 2: Split
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# Step 3: Fit
model = LogisticRegression()
model.fit(X_train, y_train)

# Step 4: Predict
preds = model.predict(X_test)

# Step 5: Evaluate
print("Accuracy:", accuracy_score(y_test, preds))
print(confusion_matrix(y_test, preds))
```

Emphasize: **the same pattern works for every sklearn model**. Just change the import and the class name.

Models to introduce (no theory, just "when to use"):
- `LogisticRegression` — binary/multi-class classification, fast, simple baseline
- `RandomForestClassifier` — usually beats logistic regression on tabular data
- `KMeans` — unsupervised clustering (mention briefly)

#### 4.2.5. Hands-on (30 min)

Use Titanic from Day 1. Students must:
1. Select features (e.g., `Pclass`, `Sex`, `Age`, `Fare`) and target (`Survived`)
2. Encode `Sex` to numeric (0/1)
3. Fill missing `Age` with the mean
4. Train `LogisticRegression` and report accuracy
5. Train `RandomForestClassifier` and compare

#### 4.2.6. Day 2 Survival Outcomes

After Day 2, a student should be able to:
- ✅ Read any sklearn notebook and predict what each block does
- ✅ Replace `LogisticRegression` with another model and have the code still work
- ✅ Understand confusion matrix output
- ✅ Recognize the train/test/split pattern

---

### Day 3 — PyTorch Basics: Reading the Training Loop

**Duration:** 90 minutes
**Goal:** See PyTorch code without panic; understand what each line does

#### 4.3.1. Schedule

| Time | Block | Activity |
|---|---|---|
| 0:00–0:15 | Tensors = NumPy + GPU | Live coding with parallels to NumPy |
| 0:15–0:35 | Anatomy of a neural network | Build a small MLP with diagrams |
| 0:35–1:00 | THE training loop pattern | Most important block of the day |
| 1:00–1:30 | Hands-on | Train a tiny MLP on MNIST |

#### 4.3.2. Tensors (15 min)

Frame as: **"PyTorch tensors are NumPy arrays that can run on GPU and remember gradients."**

Show parallels:
```python
# NumPy                        # PyTorch
import numpy as np             import torch
a = np.array([1,2,3])          a = torch.tensor([1,2,3])
a.shape                        a.shape
a + 1                          a + 1
a.mean()                       a.mean()
                               a = a.to('cuda')   # NEW: move to GPU
                               a.requires_grad_() # NEW: track gradients
```

#### 4.3.3. Anatomy of a Neural Network (20 min)

Build progressively with a diagram:

```
Input (784 numbers, flattened image)
     ↓
nn.Linear(784, 128)   ← weights to learn
     ↓
nn.ReLU()             ← non-linearity
     ↓
nn.Linear(128, 10)    ← weights to learn
     ↓
Output (10 numbers, one per class)
```

Show the code:
```python
import torch.nn as nn

model = nn.Sequential(
    nn.Linear(784, 128),
    nn.ReLU(),
    nn.Linear(128, 10),
)
```

Concepts (intuitive only, no math):
- **Linear layer** = "multiply by a matrix of learnable numbers"
- **Activation (ReLU)** = "introduces non-linearity, lets the network learn complex patterns"
- **Forward pass** = "data flows from input to output"

#### 4.3.4. THE Training Loop (25 min)

This is **the most important code block of the entire bootcamp**. Students must internalize this pattern.

```python
import torch.optim as optim

criterion = nn.CrossEntropyLoss()
optimizer = optim.Adam(model.parameters(), lr=0.001)

for epoch in range(num_epochs):
    for x, y in dataloader:
        optimizer.zero_grad()      # 1. Reset gradients
        output = model(x)          # 2. Forward pass
        loss = criterion(output, y)# 3. Compute loss
        loss.backward()            # 4. Backward pass (compute gradients)
        optimizer.step()           # 5. Update weights
```

Explain each line with an analogy:
- `zero_grad()` — "Erase the whiteboard before writing new gradients"
- `model(x)` — "Make a prediction"
- `criterion(output, y)` — "Measure how wrong we were"
- `loss.backward()` — "Tell each weight which direction to move"
- `optimizer.step()` — "Actually move the weights"

#### 4.3.5. Hands-on: MLP on MNIST (30 min)

Provide skeleton code; students fill in the training loop. Use 2-3 epochs only — keep it fast.

```python
from torchvision import datasets, transforms
from torch.utils.data import DataLoader

# Data
train_ds = datasets.MNIST('./data', train=True, download=True,
                          transform=transforms.ToTensor())
train_loader = DataLoader(train_ds, batch_size=64, shuffle=True)

# Model
model = nn.Sequential(
    nn.Flatten(),
    nn.Linear(784, 128),
    nn.ReLU(),
    nn.Linear(128, 10),
)

# Training loop — STUDENTS COMPLETE THIS PART
# ...
```

#### 4.3.6. Day 3 Survival Outcomes

After Day 3, a student should be able to:
- ✅ Read a PyTorch training loop and identify each of the 5 standard lines
- ✅ Understand `tensor.shape`, `.to(device)`
- ✅ Build a simple MLP with `nn.Sequential`
- ✅ Not panic when seeing `optimizer.zero_grad()`

---

### Day 4 — Transfer Learning + Race Day Survival

**Duration:** 90 minutes
**Goal:** Fine-tune a pre-trained model + know how to survive an actual competition day

#### 4.4.1. Schedule

| Time | Block | Activity |
|---|---|---|
| 0:00–0:10 | CNN concept (brief) | Diagram only, no theory |
| 0:10–0:20 | Why transfer learning wins | Conceptual motivation |
| 0:20–1:00 | Hands-on: fine-tune ResNet18 | Provide template, students fill in |
| 1:00–1:20 | Race day survival guide | Walk through the checklist |
| 1:20–1:30 | Q&A + resources for self-study | Hand out the resource list |

#### 4.4.2. CNN Concept (10 min)

Diagram only:

```
Image (3×224×224)
       ↓
Conv layers — detect edges, textures, shapes
       ↓
Pool layers — shrink spatial size
       ↓
       ... (repeated many times)
       ↓
Fully connected layer — final classification
       ↓
Output (num_classes scores)
```

Key intuition:
- Early layers detect simple features (edges, colors)
- Deeper layers detect complex features (eyes, wheels)
- The "head" (last fully connected layer) does the actual classification

#### 4.4.3. Why Transfer Learning Wins (10 min)

Tell this story:
> "ResNet18 has been trained on 1.2 million images of 1000 classes. It already knows what edges, eyes, wheels, fur, and metal look like. When you give it your dataset of 500 flower images, you don't need to teach it everything again — you just need to replace the final layer (the 'head') and let it adapt to your specific classes."

Three modes:
1. **Frozen base, train only head** — fastest, good when little data
2. **Fine-tune some layers** — middle ground
3. **Fine-tune everything** — slow, needs lots of data

For NOAI: **almost always use mode 1 or 2.**

#### 4.4.4. The Transfer Learning Template (40 min)

Give students this template and walk through it. They take it home.

```python
import torch
import torch.nn as nn
import torch.optim as optim
from torchvision import models, transforms, datasets
from torch.utils.data import DataLoader

# 1. Load pre-trained model
model = models.resnet18(pretrained=True)

# 2. Freeze all layers
for param in model.parameters():
    param.requires_grad = False

# 3. Replace the head (final classification layer)
NUM_CLASSES = 10  # change to match your task
model.fc = nn.Linear(model.fc.in_features, NUM_CLASSES)

# 4. Move to GPU if available
device = 'cuda' if torch.cuda.is_available() else 'cpu'
model = model.to(device)

# 5. Standard training loop (only trains the new head)
criterion = nn.CrossEntropyLoss()
optimizer = optim.Adam(model.fc.parameters(), lr=0.001)

for epoch in range(3):
    for x, y in train_loader:
        x, y = x.to(device), y.to(device)
        optimizer.zero_grad()
        output = model(x)
        loss = criterion(output, y)
        loss.backward()
        optimizer.step()
```

Hands-on: students apply this to a small image classification dataset (e.g., CIFAR-10 subset or a flowers dataset).

#### 4.4.5. Race Day Survival Guide (20 min)

Walk through this guide; print and give to students.

##### Phase 1 — Before touching the keyboard (first 15 min)
- Read the task description **completely**
- Identify the **scoring metric** (accuracy? F1? IoU? RMSE?)
- Look at the **sample submission file** — what format is required?
- Open the **baseline notebook** if provided — what does it do?

##### Phase 2 — Get a working pipeline first (don't optimize yet)
- Run the baseline as-is and produce a submission
- Confirm the submission is accepted by the scoring system
- **Goal: get a non-zero score on the leaderboard within the first hour**

##### Phase 3 — Improve incrementally
- Change ONE thing at a time, then submit:
  - Try a different model (`LogisticRegression` → `RandomForest`)
  - Add or remove one feature
  - Increase epochs
  - Adjust learning rate
- Track which change moved the score in which direction

##### Phase 4 — When stuck
- Read the **last line** of the error message, not the first
- Print `df.head()`, `tensor.shape`, `len(dataset)` at every step
- If a model isn't training: lower the learning rate, simplify the model
- **Asking mentors is allowed** and expected

##### Don'ts
- ❌ Don't train from scratch when pre-trained models are available
- ❌ Don't write "clean" code — make it work first
- ❌ Don't run 100 epochs initially — try 2-3 first
- ❌ Don't change multiple things between submissions — you won't know what helped

#### 4.4.6. Resources for Self-Study (10 min)

Hand out this list (also at the end of this document):

| Priority | Resource | When to use |
|---|---|---|
| 1 | [Kaggle Learn — Pandas](https://www.kaggle.com/learn/pandas) | Reinforce Pandas |
| 2 | [Kaggle Learn — Intro/Intermediate ML](https://www.kaggle.com/learn) | Practice sklearn |
| 3 | [Malaysia IOAI TSP 2025 Repo](https://github.com/jaredliw/ioai-tsp-2025) | See real baseline notebooks |
| 4 | [Fast.ai Practical Deep Learning](https://course.fast.ai/) | Go deeper into DL |
| 5 | [IOAI 2024/2025 Tasks](https://github.com/IOAI-official) | Practice on real problems |
| 6 | [PyTorch Tutorials](https://pytorch.org/tutorials/) | Reference |

---

## 5. Code Templates Reference

These four templates cover ~80% of NOAI Stage 2 tasks. Students should leave the bootcamp with these memorized or saved.

### 5.1. Template A — Tabular ML (sklearn)

```python
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, confusion_matrix

# Load
df = pd.read_csv('train.csv')

# Clean
df = df.fillna(df.mean(numeric_only=True))

# Define features and target
X = df.drop('target', axis=1)
y = df['target']

# Split
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# Train
model = RandomForestClassifier(n_estimators=100, random_state=42)
model.fit(X_train, y_train)

# Evaluate
preds = model.predict(X_test)
print("Accuracy:", accuracy_score(y_test, preds))
print(confusion_matrix(y_test, preds))
```

### 5.2. Template B — Standard PyTorch Training Loop

```python
import torch
import torch.nn as nn
import torch.optim as optim

device = 'cuda' if torch.cuda.is_available() else 'cpu'
model = model.to(device)
criterion = nn.CrossEntropyLoss()
optimizer = optim.Adam(model.parameters(), lr=0.001)

for epoch in range(num_epochs):
    model.train()
    for x, y in train_loader:
        x, y = x.to(device), y.to(device)
        optimizer.zero_grad()
        output = model(x)
        loss = criterion(output, y)
        loss.backward()
        optimizer.step()

    # Validation
    model.eval()
    correct = 0
    total = 0
    with torch.no_grad():
        for x, y in val_loader:
            x, y = x.to(device), y.to(device)
            output = model(x)
            preds = output.argmax(dim=1)
            correct += (preds == y).sum().item()
            total += y.size(0)
    print(f"Epoch {epoch}: val acc = {correct/total:.4f}")
```

### 5.3. Template C — Transfer Learning (CV)

```python
import torch.nn as nn
from torchvision import models

model = models.resnet18(pretrained=True)
for param in model.parameters():
    param.requires_grad = False
model.fc = nn.Linear(model.fc.in_features, NUM_CLASSES)

# Then use Template B for training
```

### 5.4. Template D — Image DataLoader

```python
from torchvision import transforms, datasets
from torch.utils.data import DataLoader

transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406],
                         [0.229, 0.224, 0.225]),
])

train_ds = datasets.ImageFolder('data/train', transform=transform)
train_loader = DataLoader(train_ds, batch_size=32, shuffle=True)
```

---

## 6. Per-Day Outcome Checklist

Use this as a quick assessment after each day.

### After Day 1 — Student can…
- [ ] Load any CSV with `pd.read_csv` and inspect it
- [ ] Filter rows with a boolean condition
- [ ] Compute group statistics with `groupby`
- [ ] Handle missing values
- [ ] Do basic NumPy operations and understand shapes

### After Day 2 — Student can…
- [ ] Recite the 5-step ML pipeline (Load → Split → Fit → Predict → Evaluate)
- [ ] Train a sklearn model end-to-end
- [ ] Swap one model for another (same pattern)
- [ ] Read a confusion matrix
- [ ] Plot a histogram, scatter, and bar chart

### After Day 3 — Student can…
- [ ] Identify the 5 standard lines of a PyTorch training loop
- [ ] Build a simple MLP with `nn.Sequential`
- [ ] Move data and model to GPU
- [ ] Train an MLP on MNIST (or similar simple dataset)

### After Day 4 — Student can…
- [ ] Fine-tune a ResNet18 by replacing the head
- [ ] Use the Race Day Survival Guide
- [ ] Find help in self-study resources
- [ ] Modify any of the 4 code templates for a new task

---

## 7. Common Mistakes to Watch For

| Mistake | Day | How to address |
|---|---|---|
| Using `=` instead of `==` for filtering | 1 | `df[df['x'] = 5]` is a syntax error; show correct version repeatedly |
| Forgetting `plt.show()` | 2 | Demonstrate the difference once |
| Forgetting to scale features for some models | 2 | Mention but don't dwell — Random Forest doesn't need it |
| Not splitting train/test | 2 | Always show side-by-side comparison of "with split" vs "without" |
| Forgetting `optimizer.zero_grad()` | 3 | Show the consequence — gradients accumulate, training diverges |
| Forgetting `model.train()` / `model.eval()` | 3 | Mention briefly; consequence is mostly minor for simple MLPs |
| Forgetting `.to(device)` | 3 | Show error message; have students recognize it |
| Trying to train ResNet50 from scratch | 4 | Reinforce: always start with `pretrained=True` |
| Changing many things between submissions | 4 | Reinforce in race day guide |

---

## 8. Suggested Datasets

Use these throughout the bootcamp. They are small, well-known, and remove cognitive load of understanding new data.

| Dataset | Used in | Why |
|---|---|---|
| Titanic (CSV) | Days 1, 2 | Classic, small, mixed types, has missing values — perfect for Pandas + sklearn |
| MNIST | Day 3 | 28×28 grayscale digits; trains in seconds |
| CIFAR-10 (subset) or Flowers | Day 4 | Real RGB images; works well with ResNet |

All are downloadable directly via `torchvision.datasets` or Kaggle.

---

## 9. Logistics for the Instructor

### 9.1. Pre-Bootcamp Setup
- Send students a setup guide 1 week before:
  - Install Python 3.10+
  - Install: `numpy pandas matplotlib scikit-learn torch torchvision jupyter`
  - Or: provide a Google Colab template (recommended — avoids setup issues)
- Verify everyone can run a notebook before Day 1

### 9.2. Teaching Style
- **Live coding > slides** — students learn debugging by watching you debug
- **Type, don't paste** — slows you down to student speed
- **Make intentional mistakes** — and recover from them visibly
- **Encourage questions** — pause every 10 minutes to invite them

### 9.3. Materials to Prepare per Day
- Day 1: `titanic.csv`, starter notebook with empty cells
- Day 2: same Titanic data, starter notebook
- Day 3: MNIST is auto-downloaded; provide skeleton training loop
- Day 4: ResNet template, small image dataset (or use CIFAR-10)

### 9.4. Hand-Outs
- After Day 4, give every student:
  - The 4 code templates (single PDF or notebook)
  - The Race Day Survival Guide (1-page printout)
  - The resource list with priority order

---

## 10. Beyond the Bootcamp — Recommended Self-Study Path

For students who want to push further before the actual camp:

1. **Week 1 after bootcamp:** Complete Kaggle Learn Pandas + Intro to ML
2. **Week 2:** Complete Kaggle Learn Intermediate ML + Computer Vision
3. **Week 3:** Work through one notebook from Malaysia IOAI TSP 2025 repo
4. **Week 4:** Attempt one task from IOAI 2024 or NOAI China 2024 repo end-to-end

This path takes a "survivor" student to "competent" student in roughly one month of part-time work.

---

## 11. Quick-Reference Cheat Sheet (one page)

```
═══════════════════════════════════════════════════════════
  NOAI STAGE 2 — SURVIVAL CHEAT SHEET
═══════════════════════════════════════════════════════════

PANDAS
  pd.read_csv('file.csv')
  df.head() / df.info() / df.describe()
  df['col'] / df[['c1','c2']] / df.iloc[0:5]
  df[df['x'] > 5]
  df.fillna(value) / df.isnull().sum()
  df.groupby('col').mean()

NUMPY
  np.array([1,2,3]) / np.zeros((3,3))
  arr.shape / arr.reshape(2,3)
  arr.mean() / arr.sum() / arr.max()

SKLEARN PIPELINE (5 steps)
  1. Load        df = pd.read_csv(...)
  2. Split       train_test_split(X, y, test_size=0.2)
  3. Fit         model.fit(X_train, y_train)
  4. Predict     preds = model.predict(X_test)
  5. Evaluate    accuracy_score(y_test, preds)

PYTORCH TRAINING LOOP (5 lines)
  optimizer.zero_grad()
  output = model(x)
  loss = criterion(output, y)
  loss.backward()
  optimizer.step()

TRANSFER LEARNING (3 steps)
  model = models.resnet18(pretrained=True)
  for p in model.parameters(): p.requires_grad = False
  model.fc = nn.Linear(model.fc.in_features, NUM_CLASSES)

RACE DAY
  1. Read task + metric (15 min, no code yet)
  2. Run baseline → first submission
  3. Improve ONE thing → submit → repeat
  4. Stuck? Read last error line, print shapes, ask mentor
═══════════════════════════════════════════════════════════
```

---

*End of plan. For revisions, refer to the official [NOAI Thailand Syllabus](https://ioai-official.org/republic-of-kazakhstan/syllabus-2026/) and [IOAI Resources](https://ioai-official.org/resources/).*
