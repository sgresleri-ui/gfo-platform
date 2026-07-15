export interface AccountMapping {
  code: string;
  name: string;
  institution: string;
  country: string;
  type: string;
  sheet: string;
  cell: string;
  currency: string;
}

export const ACCOUNT_MAPPING: AccountMapping[] = [
  {
    code: "IBKR",
    name: "Interactive Brokers",
    institution: "Interactive Brokers",
    country: "Ireland",
    type: "Broker",
    sheet: "Conto Economico",
    cell: "P23",
    currency: "EUR",
  },
  {
    code: "RAKBANK_EUR",
    name: "RakBank EUR",
    institution: "RakBank",
    country: "UAE",
    type: "Bank",
    sheet: "Conto Economico",
    cell: "P28",
    currency: "EUR",
  },
  {
    code: "RAKBANK_AED",
    name: "RakBank AED",
    institution: "RakBank",
    country: "UAE",
    type: "Bank",
    sheet: "Conto Economico",
    cell: "P33",
    currency: "AED",
  },
  {
    code: "FINECO_ST",
    name: "Fineco ST",
    institution: "Fineco",
    country: "Italy",
    type: "Bank",
    sheet: "Conto Economico",
    cell: "P38",
    currency: "EUR",
  },
  {
    code: "FINECO_SA",
    name: "Fineco SA",
    institution: "Fineco",
    country: "Italy",
    type: "Bank",
    sheet: "Conto Economico",
    cell: "P43",
    currency: "EUR",
  },
  {
    code: "BBVA",
    name: "BBVA",
    institution: "BBVA",
    country: "Spain",
    type: "Bank",
    sheet: "Conto Economico",
    cell: "P48",
    currency: "EUR",
  },
  {
    code: "REVOLUT",
    name: "Revolut",
    institution: "Revolut",
    country: "Lithuania",
    type: "Fintech",
    sheet: "Conto Economico",
    cell: "P53",
    currency: "EUR",
  },
];