// Oblik mock-a za pg Pool. jest.mock('../../db', ...) i dalje mora biti pozvan
// u svakom test fajlu direktno (Jest hoisting ograničenje - ne može preko importa).

function createMockClient() {
    return {
        query: jest.fn(),
        release: jest.fn()
    };
}

module.exports = { createMockClient };
