import Foundation
import Capacitor
import StoreKit

/// Native Capacitor plugin bridging StoreKit 2 to JavaScript.
/// Handles product loading, purchases, transaction listening, and restore.
@objc(StoreKitPlugin)
public class StoreKitPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "StoreKitPlugin"
    public let jsName = "StoreKit"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getProducts", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "purchase", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restorePurchases", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getActiveSubscriptions", returnType: CAPPluginReturnPromise),
    ]

    private var transactionListener: Task<Void, Error>?

    override public func load() {
        // Start listening for transaction updates (renewals, revocations, etc.)
        transactionListener = listenForTransactions()
    }

    deinit {
        transactionListener?.cancel()
    }

    // MARK: - Get Products

    @objc func getProducts(_ call: CAPPluginCall) {
        guard let productIds = call.getArray("productIds", String.self) else {
            call.reject("Missing productIds array")
            return
        }

        Task {
            do {
                let products = try await Product.products(for: Set(productIds))
                let result = products.map { product -> [String: Any] in
                    var dict: [String: Any] = [
                        "id": product.id,
                        "displayName": product.displayName,
                        "description": product.description,
                        "displayPrice": product.displayPrice,
                        "price": NSDecimalNumber(decimal: product.price).doubleValue,
                        "type": product.type == .autoRenewable ? "autoRenewable" : "other",
                    ]
                    if let sub = product.subscription {
                        dict["subscriptionPeriod"] = [
                            "unit": sub.subscriptionPeriod.unit == .month ? "month" : "year",
                            "value": sub.subscriptionPeriod.value,
                        ]
                    }
                    return dict
                }
                call.resolve(["products": result])
            } catch {
                call.reject("Failed to load products: \(error.localizedDescription)")
            }
        }
    }

    // MARK: - Purchase

    @objc func purchase(_ call: CAPPluginCall) {
        guard let productId = call.getString("productId") else {
            call.reject("Missing productId")
            return
        }

        let appAccountToken = call.getString("appAccountToken")

        Task {
            do {
                let products = try await Product.products(for: [productId])
                guard let product = products.first else {
                    call.reject("Product not found: \(productId)")
                    return
                }

                var purchaseOptions: Set<Product.PurchaseOption> = []
                if let tokenStr = appAccountToken, let tokenUUID = UUID(uuidString: tokenStr) {
                    purchaseOptions.insert(.appAccountToken(tokenUUID))
                }

                let result = try await product.purchase(options: purchaseOptions)

                switch result {
                case .success(let verification):
                    let transaction = try checkVerified(verification)
                    await transaction.finish()

                    let txData = transactionToDict(transaction)
                    call.resolve([
                        "status": "success",
                        "transaction": txData,
                    ])

                case .userCancelled:
                    call.resolve(["status": "cancelled"])

                case .pending:
                    call.resolve(["status": "pending"])

                @unknown default:
                    call.resolve(["status": "unknown"])
                }
            } catch {
                call.reject("Purchase failed: \(error.localizedDescription)")
            }
        }
    }

    // MARK: - Restore Purchases

    @objc func restorePurchases(_ call: CAPPluginCall) {
        Task {
            do {
                // Sync with App Store to get latest transaction state
                try await AppStore.sync()

                var restoredTransactions: [[String: Any]] = []

                for await result in Transaction.currentEntitlements {
                    do {
                        let transaction = try checkVerified(result)
                        restoredTransactions.append(transactionToDict(transaction))
                    } catch {
                        // Skip unverified transactions
                        continue
                    }
                }

                call.resolve([
                    "transactions": restoredTransactions,
                    "count": restoredTransactions.count,
                ])
            } catch {
                call.reject("Restore failed: \(error.localizedDescription)")
            }
        }
    }

    // MARK: - Get Active Subscriptions

    @objc func getActiveSubscriptions(_ call: CAPPluginCall) {
        Task {
            var activeSubscriptions: [[String: Any]] = []

            for await result in Transaction.currentEntitlements {
                do {
                    let transaction = try checkVerified(result)
                    if transaction.productType == .autoRenewable {
                        activeSubscriptions.append(transactionToDict(transaction))
                    }
                } catch {
                    continue
                }
            }

            call.resolve(["subscriptions": activeSubscriptions])
        }
    }

    // MARK: - Transaction Listener

    private func listenForTransactions() -> Task<Void, Error> {
        return Task.detached { [weak self] in
            for await result in Transaction.updates {
                do {
                    let transaction = try self?.checkVerified(result)
                    if let tx = transaction {
                        await tx.finish()
                        // Notify JS about the transaction update
                        self?.notifyListeners("transactionUpdate", data: self?.transactionToDict(tx) ?? [:])
                    }
                } catch {
                    // Transaction failed verification — ignore
                }
            }
        }
    }

    // MARK: - Helpers

    private func checkVerified<T>(_ result: VerificationResult<T>) throws -> T {
        switch result {
        case .unverified(_, let error):
            throw error
        case .verified(let safe):
            return safe
        }
    }

    private func transactionToDict(_ tx: Transaction) -> [String: Any] {
        var dict: [String: Any] = [
            "transactionId": String(tx.id),
            "originalTransactionId": String(tx.originalID),
            "productId": tx.productID,
            "purchaseDate": Int(tx.purchaseDate.timeIntervalSince1970 * 1000),
        ]

        if let expirationDate = tx.expirationDate {
            dict["expiresDate"] = Int(expirationDate.timeIntervalSince1970 * 1000)
        }

        if let appAccountToken = tx.appAccountToken {
            dict["appAccountToken"] = appAccountToken.uuidString
        }

        if let webOrderLineItemID = tx.webOrderLineItemID {
            dict["webOrderLineItemID"] = String(webOrderLineItemID)
        }

        dict["isUpgraded"] = tx.isUpgraded
        dict["revocationDate"] = tx.revocationDate.map { Int($0.timeIntervalSince1970 * 1000) }

        // Get the JWS representation for backend verification
        // Note: Transaction doesn't directly expose JWS in StoreKit 2,
        // but the backend verification happens via Apple Server Notifications.
        // For restore, we send the transaction details directly.

        return dict
    }
}
