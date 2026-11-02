const { DeliveryRateSettings } = require("../models");

const defaultRates = [{
  id: "rate-default",
  condition: "weight",
  minWeight: 0,
  maxWeight: 10,
  rowCost: 10,
  itemCost: 0,
  kgCost: 0,
  percentCost: 0,
  label: "Standard delivery",
  abort: false,
}];

const validMoney = (value) => Number.isFinite(Number(value)) && Number(value) >= 0 && Math.round(Number(value) * 100) === Number(value) * 100 && Number(value) <= 99999999.99;

exports.defaults = defaultRates;

exports.get = async (_req, res) => {
  try {
    const settings = await DeliveryRateSettings.findByPk(1);
    return res.json({ rates: settings?.rates || defaultRates });
  } catch (error) {
    console.error("Load delivery rate settings error:", error);
    return res.status(500).json({ message: "Unable to load delivery rate settings" });
  }
};

exports.save = async (req, res) => {
  const rates = req.body.rates;
  if (!Array.isArray(rates) || rates.length < 1 || rates.length > 20) return res.status(400).json({ message: "Add between 1 and 20 delivery rate rows" });
  const normalized = [];
  for (const [index, row] of rates.entries()) {
    const minWeight = Number(row.minWeight);
    const maxWeight = Number(row.maxWeight);
    if (!Number.isFinite(minWeight) || !Number.isFinite(maxWeight) || minWeight < 0 || maxWeight <= minWeight || maxWeight > 10) return res.status(400).json({ message: `Rate row ${index + 1}: enter a valid weight range within 0–10 kg` });
    if (![row.rowCost, row.itemCost, row.kgCost, row.percentCost].every(validMoney)) return res.status(400).json({ message: `Rate row ${index + 1}: costs must be nonnegative amounts with up to two decimal places` });
    const label = typeof row.label === "string" ? row.label.trim() : "";
    if (label.length > 80) return res.status(400).json({ message: `Rate row ${index + 1}: label must be 80 characters or fewer` });
    if (normalized.some((saved) => minWeight < saved.maxWeight && maxWeight > saved.minWeight)) return res.status(400).json({ message: "Weight ranges cannot overlap" });
    normalized.push({ id: String(row.id || `rate-${index}`), condition: "weight", minWeight, maxWeight, rowCost: Number(row.rowCost), itemCost: Number(row.itemCost), kgCost: Number(row.kgCost), percentCost: Number(row.percentCost), label, abort: Boolean(row.abort) });
  }
  normalized.sort((a, b) => a.minWeight - b.minWeight);
  try {
    await DeliveryRateSettings.upsert({ id: 1, rates: normalized, updatedBy: req.user.id });
    return res.json({ message: "Delivery rate table saved", rates: normalized });
  } catch (error) {
    console.error("Save delivery rate settings error:", error);
    return res.status(500).json({ message: "Unable to save delivery rate settings" });
  }
};
