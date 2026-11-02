const { Op } = require("sequelize");

const getListQuery = (query = {}) => {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 10));
  const search = typeof query.search === "string" ? query.search.trim().slice(0, 120) : "";
  return { page, limit, search, offset: (page - 1) * limit, Op };
};

const withPagination = (result, page, limit) => ({
  ...result,
  pagination: {
    page,
    limit,
    total: result.count,
    totalPages: Math.max(1, Math.ceil(result.count / limit)),
  },
});

module.exports = { getListQuery, withPagination };
