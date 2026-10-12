-- Required by invoice.service, reports.service, orders.createInvoiceDB
ALTER TABLE `invoices`
  ADD COLUMN `service_charge_total` decimal(10,2) DEFAULT NULL AFTER `tax_total`;
