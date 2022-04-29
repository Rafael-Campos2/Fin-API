const express = require("express");
const { v4: uuidV4 } = require("uuid");

const app = express();

app.use(express.json());

let customers = [];

const verifyIfExistsAccountCPF = (request, response, next) => {
  const { cpf } = request.headers;

  const customer = customers.find((customer) => customer.cpf === +cpf);

  if (!customer) {
    return response.status(400).json({ error: "Customer not found!" });
  }

  request.customer = customer;

  return next();
};

const getBalance = (statement) => {
  const balance = statement.reduce((acc, statement) => {
    if (statement.type === "credit") {
      return acc + statement.amount;
    }

    return acc - statement.amount;
  }, 0);

  return balance;
};

app.post("/account", (request, response) => {
  const { cpf, name } = request.body;

  const customerAlreadyExists = customers.some(
    (customer) => customer.cpf === cpf
  );

  if (customerAlreadyExists) {
    return response.status(400).json({ error: "Customer already exists!" });
  }

  const customer = {
    id: uuidV4(),
    cpf,
    name,
    statement: [],
  };

  customers.push(customer);

  return response.status(201).json(customer);
});

app.get("/statement", verifyIfExistsAccountCPF, (request, response) => {
  const { customer } = request;

  return response.json(customer.statement);
});

app.post("/deposit", verifyIfExistsAccountCPF, (request, response) => {
  const { amount, description } = request.body;
  const { customer } = request;

  const statementOperation = {
    type: "credit",
    amount,
    description,
    created_at: new Date(),
    uuid: uuidV4(),
  };

  customer.statement.push(statementOperation);

  return response.status(201).json(statementOperation);
});

app.post("/withdraw", verifyIfExistsAccountCPF, (request, response) => {
  const { amount } = request.body;
  const { customer } = request;

  const customerBalance = getBalance(customer.statement);

  if (amount > customerBalance) {
    return response.status(400).json({ error: "Insufficient funds!!" });
  }

  const statementOperation = {
    amount,
    type: "debit",
    created_at: new Date(),
    uuid: uuidV4(),
  };

  customer.statement.push(statementOperation);

  return response.status(201).json(statementOperation);
});

app.get("/statement/date", verifyIfExistsAccountCPF, (request, response) => {
  const { customer } = request;
  const { date } = request.query;

  const dateFormat = new Date(date + " 00:00");

  const statement = customer.statement.filter(
    (statement) =>
      statement.created_at.toString() === new Date(dateFormat).toString()
  );

  return response.json(statement);
});

app.put("/account", verifyIfExistsAccountCPF, (request, response) => {
  const { customer } = request;
  const { name } = request.body;

  customer.name = name;

  return response.status(201).send();
});

app.get("/account", verifyIfExistsAccountCPF, (request, response) => {
  const { customer } = request;

  return response.status(200).json(customer);
});

app.delete("/account", verifyIfExistsAccountCPF, (request, response) => {
  const { customer } = request;

  const updatedCustomers = customers.filter(
    (currentCustomer) => currentCustomer.uuid !== customer.uuid
  );

  customers = updatedCustomers;

  return response.status(204).send();
});

app.listen(3333, () => console.log("Server is running"));
