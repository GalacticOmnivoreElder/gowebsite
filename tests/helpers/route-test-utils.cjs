const assert = require("node:assert/strict");

const NextResponse = {
  json(body, init = {}) {
    return {
      body,
      headers: init.headers || {},
      status: init.status || 200,
      async json() {
        return body;
      },
    };
  },
};

function createRequest({ headers = {}, jsonBody, url = "http://localhost:3000/api/test" } = {}) {
  const normalized = Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value])
  );

  return {
    headers: {
      get(name) {
        return normalized[name.toLowerCase()] || null;
      },
    },
    json: async () => jsonBody,
    url,
  };
}

function createUserDoc(data, updates = []) {
  return {
    exists: !!data,
    data: () => data || {},
    ref: {
      async update(update) {
        updates.push(update);
      },
    },
  };
}

function createAdminDb({ users = {}, orders = [] } = {}) {
  return {
    collection(name) {
      if (name === "users") {
        return {
          doc(uid) {
            return {
              async get() {
                return createUserDoc(users[uid]);
              },
            };
          },
        };
      }

      if (name === "orders") {
        return {
          where(field, operator, value) {
            assert.equal(field, "userId");
            assert.equal(operator, "==");
            return {
              orderBy(sortField, direction) {
                assert.equal(sortField, "createdAt");
                assert.equal(direction, "desc");
                return {
                  async get() {
                    return {
                      forEach(callback) {
                        orders
                          .filter((order) => order.data.userId === value)
                          .forEach((order) =>
                            callback({
                              id: order.id,
                              data: () => order.data,
                            })
                          );
                      },
                    };
                  },
                };
              },
            };
          },
        };
      }

      throw new Error(`Unexpected collection: ${name}`);
    },
  };
}

module.exports = {
  NextResponse,
  createAdminDb,
  createRequest,
  createUserDoc,
};
