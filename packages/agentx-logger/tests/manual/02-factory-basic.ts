/**
 * Test 2: LoggerFactory Usage (SLF4J-style)
 *
 * Tests the factory-based logger creation.
 */

import { LoggerFactory } from "../../src";

console.log("\n=== Test 2: LoggerFactory (SLF4J-style) ===\n");

// Get logger by class
class PaymentService {
  private logger = LoggerFactory.getLogger(PaymentService);

  processPayment(amount: number) {
    this.logger.info("Processing payment", { amount, currency: "USD" });
    this.logger.debug("Payment gateway called");
    this.logger.info("Payment processed successfully");
  }

  refundPayment(amount: number) {
    this.logger.warn("Refund initiated", { amount });
    this.logger.info("Refund completed");
  }
}

// Get logger by name
const appLogger = LoggerFactory.getLogger("Application");
appLogger.info("Application started");
appLogger.debug("Initializing modules");

const dbLogger = LoggerFactory.getLogger("Database");
dbLogger.info("Database connection established");
dbLogger.debug("Connection pool size: 10");

// Run tests
const paymentService = new PaymentService();
paymentService.processPayment(99.99);
paymentService.refundPayment(50.0);

console.log("\n✅ Test 2 passed\n");
