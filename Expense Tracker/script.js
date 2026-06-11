let transactions = [];
let chart;

const form =
document.getElementById("transactionForm");

form.addEventListener("submit", function(event){

    event.preventDefault();

    console.log(itemName.value);
    console.log(amount.value);

    if(
        itemName.value === "" ||
        amount.value === "" ||
        category.value === ""
    ){
        alert("Isi semua field!");
        return;
    }

    const transaction = {
        name: itemName.value,
        amount: Number(amount.value),
        category: category.value
    };

    transactions.push(transaction);
    renderTransactions();
    updateBalance();
    updateChart();
    showToast("Transaksi ditambahkan");
    
});

function showToast(message) {

    const toast =
    document.getElementById("toast");

    toast.textContent = message;
    toast.style.display = "block";

    setTimeout(function() {
        toast.style.display = "none";
    }, 3000);
}

const itemName =
document.getElementById("itemName");

const amount =
document.getElementById("amount");

const category =
document.getElementById("category");

function renderTransactions(){

    const list =
    document.getElementById("transactionList");

    list.innerHTML = "";
    transactions.forEach(function(item, index){
        list.innerHTML += `
        <div>
        ${item.name}
        -
        Rp${item.amount}
        -
        ${item.category}
        
        <button
        onclick="deleteTransaction(${index})">Delete</button>

        </div>
        `;
    });

}

function deleteTransaction(index){
    transactions.splice(index, 1);
    renderTransactions();
    updateBalance();
    updateChart();
}

function updateBalance(){
    let total = 0;

    transactions.forEach(function(item){
        total += item.amount;

    });

    const balance =
    document.getElementById("balance");
    balance.textContent =
    "Total: Rp" + total;
}

function updateChart(){

    const foodTotal =
    transactions
    .filter(item => item.category === "Food")
    .reduce((sum, item) => sum + item.amount, 0);

    const transportTotal =
    transactions
    .filter(item => item.category === "Transport")
    .reduce((sum, item) => sum + item.amount, 0);

    const funTotal =
    transactions
    .filter(item => item.category === "Fun")
    .reduce((sum, item) => sum + item.amount, 0);

    const ctx = document.getElementById("expenseChart");

    if (chart) {
        chart.destroy();
    }

    chart = new Chart(ctx, {
        type: "pie",
        data: {
            labels: [
                "Food",
                "Transport",
                "Fun"
            ],
            datasets: [{
                data: [
                    foodTotal,
                    transportTotal,
                    funTotal
                ]
            }]
        }
    });
}