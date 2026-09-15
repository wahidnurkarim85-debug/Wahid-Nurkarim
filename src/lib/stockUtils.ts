import { doc, getDoc, setDoc, updateDoc, collection, addDoc } from 'firebase/firestore';
import { db } from './firebase';
import { Product, CartItem, StockLog, ProcessedOrder } from '../types';

/**
 * Gets numeric stock for a given product variation safely.
 */
export function getProductStock(product: Product, variation: string): number {
  if (product.variationStocks && typeof product.variationStocks[variation] === 'number') {
    return product.variationStocks[variation];
  }
  if (typeof product.stock === 'number') {
    return product.stock;
  }
  return 100; // Default fallback stock for initial items
}

/**
 * Checks if a variation is available and in stock (> 0).
 */
export function isVariationInStock(product: Product, variation: string): boolean {
  if (product.isAvailable === false) return false;
  return getProductStock(product, variation) > 0;
}

export interface StockValidationError {
  productId: string;
  productName: string;
  variation: string;
  requestedQty: number;
  availableStock: number;
}

/**
 * Validates whether all items in cart have sufficient available stock.
 */
export function validateCartStock(cart: CartItem[], liveProducts: Product[]): {
  isValid: boolean;
  errors: StockValidationError[];
} {
  const errors: StockValidationError[] = [];

  for (const item of cart) {
    // Skip bonus promo items if free, or include them if stock applies
    const liveProd = liveProducts.find(p => p.id === item.id || p.name.toLowerCase() === item.name.toLowerCase());
    
    if (liveProd) {
      const available = getProductStock(liveProd, item.variation);
      if (item.qty > available) {
        errors.push({
          productId: liveProd.id,
          productName: item.name,
          variation: item.variation,
          requestedQty: item.qty,
          availableStock: available,
        });
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Deducts stock automatically upon WhatsApp checkout and logs the history.
 * Protects against double-deduction using orderId in processedOrders.
 */
export async function deductStockForCheckout(
  orderId: string,
  cart: CartItem[],
  liveProducts: Product[],
  customerInfo?: { name?: string; phone?: string; totalPaid?: number },
  updatedBy = 'Pelanggan (Checkout WA)'
): Promise<{ success: boolean; message: string; alreadyProcessed?: boolean }> {
  try {
    // 1. Check if Order ID has already been processed to prevent double deduction
    const processedDocRef = doc(db, 'processedOrders', orderId);
    const processedSnap = await getDoc(processedDocRef);

    if (processedSnap.exists()) {
      return {
        success: true,
        alreadyProcessed: true,
        message: `Pesanan ${orderId} sudah diproses sebelumnya (stok tidak berkurang dua kali).`,
      };
    }

    const logsToCreate: Omit<StockLog, 'id'>[] = [];
    const itemsToRecord: ProcessedOrder['items'] = [];

    // 2. Loop through cart items and deduct stock
    for (const item of cart) {
      const liveProd = liveProducts.find(p => p.id === item.id || p.name.toLowerCase() === item.name.toLowerCase());
      
      if (liveProd) {
        const targetDocId = liveProd.id;
        const prodRef = doc(db, 'products', targetDocId);
        
        // Current stock
        const currentStock = getProductStock(liveProd, item.variation);
        const newStock = Math.max(0, currentStock - item.qty);

        // Prepare updated variationStocks map
        const currentVarStocks = liveProd.variationStocks ? { ...liveProd.variationStocks } : {};
        currentVarStocks[item.variation] = newStock;

        // If product has other variations without explicit stocks, set defaults
        if (liveProd.variations && liveProd.variations.length > 0) {
          liveProd.variations.forEach(v => {
            if (typeof currentVarStocks[v] !== 'number') {
              currentVarStocks[v] = getProductStock(liveProd, v);
            }
          });
        }

        // Update product in Firestore
        await setDoc(prodRef, {
          ...liveProd,
          variationStocks: currentVarStocks,
          stock: newStock,
          updatedAt: new Date().toISOString(),
        }, { merge: true });

        // Record log item
        logsToCreate.push({
          productId: targetDocId,
          productName: item.name,
          variation: item.variation,
          previousStock: currentStock,
          newStock: newStock,
          changeAmount: -item.qty,
          type: 'checkout',
          notes: `Checkout WhatsApp (Order ${orderId})`,
          orderId: orderId,
          updatedBy: updatedBy,
          createdAt: new Date().toISOString(),
        });

        itemsToRecord.push({
          productId: targetDocId,
          productName: item.name,
          variation: item.variation,
          qty: item.qty,
        });
      }
    }

    // 3. Write stock logs to Firestore
    for (const logItem of logsToCreate) {
      await addDoc(collection(db, 'stockLogs'), logItem);
    }

    // 4. Mark order as processed
    await setDoc(processedDocRef, {
      id: orderId,
      items: itemsToRecord,
      customerName: customerInfo?.name || '',
      customerPhone: customerInfo?.phone || '',
      totalPaid: customerInfo?.totalPaid || 0,
      processedAt: new Date().toISOString(),
    });

    return {
      success: true,
      message: `Stok berhasil diperbarui untuk pesanan ${orderId}.`,
    };
  } catch (err: any) {
    console.error('Error deducting stock:', err);
    return {
      success: false,
      message: err.message || 'Gagal memperbarui stok.',
    };
  }
}

/**
 * Manually updates product stock in Admin Panel and records stock change history log.
 */
export async function updateProductStockManual(
  product: Product,
  variation: string,
  newStock: number,
  updatedBy = 'Admin / Karyawan',
  notes?: string
): Promise<void> {
  const targetDocId = product.id;
  const prodRef = doc(db, 'products', targetDocId);

  const previousStock = getProductStock(product, variation);
  const changeAmount = newStock - previousStock;

  const currentVarStocks = product.variationStocks ? { ...product.variationStocks } : {};
  currentVarStocks[variation] = newStock;

  // Fill default for other variations if missing
  if (product.variations && product.variations.length > 0) {
    product.variations.forEach(v => {
      if (typeof currentVarStocks[v] !== 'number') {
        currentVarStocks[v] = getProductStock(product, v);
      }
    });
  }

  // Update product document in Firestore
  await setDoc(prodRef, {
    ...product,
    variationStocks: currentVarStocks,
    stock: newStock,
    updatedAt: new Date().toISOString(),
  }, { merge: true });

  // Record Stock Log
  const logData: Omit<StockLog, 'id'> = {
    productId: targetDocId,
    productName: product.name,
    variation: variation,
    previousStock: previousStock,
    newStock: newStock,
    changeAmount: changeAmount,
    type: changeAmount >= 0 ? 'admin_add' : 'admin_reduce',
    notes: notes || `Admin mengubah stok (${previousStock} → ${newStock})`,
    updatedBy: updatedBy,
    createdAt: new Date().toISOString(),
  };

  await addDoc(collection(db, 'stockLogs'), logData);
}
