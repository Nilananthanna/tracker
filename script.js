const MIN_BALANCE = 3000;

const state = {
    transactions: JSON.parse(localStorage.getItem("transactions")) || [],
    emis: JSON.parse(localStorage.getItem("emis")) || [],
    goals: JSON.parse(localStorage.getItem("goals")) || [],
    bills: JSON.parse(localStorage.getItem("bills")) || []
};

// ---------- Utility ----------
function notify(msg) {
    const n = document.getElementById("notification");
    n.innerText = msg;
    n.style.display = "block";
    setTimeout(() => n.style.display = "none", 2500);
}

function saveState() {
    localStorage.setItem("transactions", JSON.stringify(state.transactions));
    localStorage.setItem("emis", JSON.stringify(state.emis));
    localStorage.setItem("goals", JSON.stringify(state.goals));
}

// ---------- Calculations ----------
function calculateTotals() {
    let income = 0, expense = 0;

    state.transactions.forEach(t => {
        if (t.type === "income") income += t.amount;
        else expense += t.amount;
    });

    const balance = income - expense;
    const savings = Math.max(balance - MIN_BALANCE, 0);

    return { income, expense, balance, savings };
}

// ---------- EMI Engine ----------
function processEMIs(balance) {
    const today = new Date();

    state.emis.forEach(emi => {
        const due = new Date(emi.nextDue);

        if (today >= due) {

            if (balance - emi.amount < MIN_BALANCE) {
                notify("EMI failed (Low Balance)");
                return;
            }

            state.transactions.push({
                id: Date.now(),
                desc: "EMI - " + emi.name,
                amount: emi.amount,
                type: "expense",
                date: due.toISOString().split("T")[0]
            });

            due.setMonth(due.getMonth() + 1);
            emi.nextDue = due.toISOString().split("T")[0];
        }
    });
}

// ---------- Intelligence Engines ----------
function healthScore(data) {
    const savingsRatio = data.balance > 0 ? (data.savings / data.balance) * 100 : 0;
    const score = Math.min(100, Math.round(savingsRatio + 20));
    return score;
}

function survivalDays(data) {
    if (data.expense === 0) return 0;
    return Math.floor(data.balance / (data.expense / 30));
}

function forecast(data) {
    const avgDaily = data.expense / 30;
    const daysLeft = 30 - new Date().getDate();
    return Math.round(data.balance - avgDaily * daysLeft);
}

// ---------- Goal Engine ----------
function allocateGoals(savings) {
    if (state.goals.length === 0) return;

    const perGoal = savings / state.goals.length;

    state.goals.forEach(g => {
        g.saved = Math.min((g.saved || 0) + perGoal, g.target);
    });
}

// ---------- UI ----------
function render() {
    const data = calculateTotals();

    processEMIs(data.balance);
    allocateGoals(data.savings);

    document.getElementById("income").innerText = data.income;
    document.getElementById("expense").innerText = data.expense;
    document.getElementById("balance").innerText = data.balance;
    document.getElementById("savings").innerText = data.savings;
    document.getElementById("healthScore").innerText = healthScore(data);
    document.getElementById("survivalDays").innerText = survivalDays(data);
    document.getElementById("forecast").innerText = forecast(data);

    renderTransactions();
    renderEMIs();
    renderGoals();

    saveState();
}

function renderTransactions() {
    const ul = document.getElementById("transactionList");
    ul.innerHTML = "";
    state.transactions.forEach(t => {
        ul.innerHTML += `<li>${t.desc} - ${t.amount} (${t.type})</li>`;
    });
}

function renderEMIs() {
    const ul = document.getElementById("emiList");
    ul.innerHTML = "";
    state.emis.forEach(e => {
        ul.innerHTML += `<li>${e.name} - ${e.amount} | Next Due: ${e.nextDue}</li>`;
    });
}

function renderGoals() {
    const ul = document.getElementById("goalList");
    ul.innerHTML = "";
    state.goals.forEach(g => {
        ul.innerHTML += `<li>${g.name}: ${g.saved || 0} / ${g.target}</li>`;
    });
}
function addBill() {
    const name = document.getElementById("billName").value;
    const amount = parseFloat(document.getElementById("billAmount").value);
    const date = document.getElementById("billDate").value;
    const type = document.getElementById("billType").value;
    const autopay = document.getElementById("billAutopay").checked;

    if (!name || !amount || !date) {
        alert("Fill all fields");
        return;
    }

    bills.push({
        id: Date.now(),
        name,
        amount,
        date,
        type,
        autopay
    });

    localStorage.setItem("bills", JSON.stringify(bills));
    renderBills();
}
function renderBills() {
    const container = document.getElementById("billList");
    container.innerHTML = "";

    bills.forEach(bill => {
        const div = document.createElement("div");
        div.className = "bill-item " + (bill.type === "ott" ? "bill-ott" : "");

        div.innerHTML = `
            <div class="bill-info">
                <strong>${bill.name}</strong><br>
                ₹${bill.amount} | Due: ${bill.date}
            </div>
            <div>
                <span class="${bill.autopay ? "autopay-enabled" : "autopay-disabled"}">
                    ${bill.autopay ? "Autopay ON" : "Autopay OFF"}
                </span>
            </div>
        `;

        container.appendChild(div);
    });
}
function checkBillAutopay(balance) {
    const today = new Date().toISOString().split("T")[0];

    bills.forEach(bill => {
        if (bill.autopay && bill.date <= today) {

            if (balance - bill.amount >= 3000) {

                balance -= bill.amount;

                alert(`Autopay successful for ${bill.name} ₹${bill.amount}`);

                // Move to next month
                let nextDate = new Date(bill.date);
                nextDate.setMonth(nextDate.getMonth() + 1);
                bill.date = nextDate.toISOString().split("T")[0];

            } else {
                alert(`Autopay failed for ${bill.name}. Minimum ₹3000 protection.`);
            }
        }
    });

    localStorage.setItem("bills", JSON.stringify(bills));
    return balance;
}
function updateSystem() {
    let balance = calculateBalance();  // Your existing function

    balance = checkBillAutopay(balance);

    document.getElementById("balance").innerText = "₹" + balance;

    renderBills();
}

// ---------- Event Listeners ----------
document.getElementById("addBtn").onclick = () => {
    const desc = document.getElementById("desc").value;
    const amount = Number(document.getElementById("amount").value);
    const type = document.getElementById("type").value;
    const date = document.getElementById("date").value;

    const totals = calculateTotals();

    if (type === "expense" && totals.balance - amount < MIN_BALANCE) {
        notify("Minimum balance required!");
        return;
    }

    state.transactions.push({ id: Date.now(), desc, amount, type, date });
    render();
};

document.getElementById("emiBtn").onclick = () => {
    const name = document.getElementById("loanName").value;
    const amount = Number(document.getElementById("emiAmount").value);
    const nextDue = document.getElementById("emiDate").value;

    state.emis.push({ id: Date.now(), name, amount, nextDue });
    render();
};

document.getElementById("goalBtn").onclick = () => {
    const name = document.getElementById("goalName").value;
    const target = Number(document.getElementById("goalTarget").value);

    state.goals.push({ id: Date.now(), name, target, saved: 0 });
    render();
};

render();