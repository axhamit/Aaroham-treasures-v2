const axios = require('axios');

class DelhiveryService {
  constructor() {
    this.apiToken = process.env.DELHIVERY_API_TOKEN;
    this.clientName = process.env.DELHIVERY_CLIENT_NAME;
    this.warehouseName = process.env.DELHIVERY_WAREHOUSE_NAME;
    this.baseUrl = (process.env.DELHIVERY_BASE_URL || 'https://staging-express.delhivery.com').replace(/\/$/, '');
    this.apiUrl = process.env.DELHIVERY_API_URL || `${this.baseUrl}/api/cmu/create.json`;
    this.waybillUrl = process.env.DELHIVERY_WAYBILL_URL || `${this.baseUrl}/waybill/api/bulk/json`;
    this.trackingUrl = process.env.DELHIVERY_TRACKING_URL || `${this.baseUrl}/api/v1/track`;
    this.timeout = Number(process.env.DELHIVERY_TIMEOUT_MS) || 15000;
  }

  configurationError(requireClient = false, requireWarehouse = false) {
    if (!this.apiToken) return 'DELHIVERY_API_TOKEN is not configured';
    if (requireClient && !this.clientName) return 'DELHIVERY_CLIENT_NAME is not configured';
    if (requireWarehouse && !this.warehouseName) return 'DELHIVERY_WAREHOUSE_NAME is not configured';
    return null;
  }

  headers() {
    return {
      Authorization: `Token ${this.apiToken}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    };
  }

  form(data) {
    return new URLSearchParams({ format: 'json', data: JSON.stringify(data) }).toString();
  }

  parseWaybills(data) {
    const candidates = [
      data,
      data?.waybills,
      data?.waybill,
      data?.data,
    ];
    for (const candidate of candidates) {
      const values = Array.isArray(candidate) ? candidate : [candidate];
      const waybills = values
        .map((value) => String(value ?? '').trim())
        .filter((value) => value && value !== this.apiToken && /^\d+$/.test(value));
      if (waybills.length) return waybills;
    }
    return [];
  }

  providerMessage(...values) {
    for (const value of values) {
      if (typeof value === 'string' && value.trim()) return value.trim();
      if (Array.isArray(value)) {
        const messages = value
          .filter((item) => typeof item === 'string' && item.trim())
          .map((item) => item.trim());
        if (messages.length) return messages.join('; ');
      }
    }
    return null;
  }

  // Check if a pincode is serviceable
  async checkServiceability(pincode) {
    try {
      const configError = this.configurationError();
      if (configError) return { success: false, message: configError };
      const response = await axios.get(
        `${this.baseUrl}/c/api/pin-codes/json/?filter_codes=${encodeURIComponent(pincode)}`,
        {
          headers: { Authorization: `Token ${this.apiToken}` },
          timeout: this.timeout,
        }
      );

      if (response.data && response.data.delivery_codes && response.data.delivery_codes.length > 0) {
        const codeData = response.data.delivery_codes[0];
        return {
          success: true,
          serviceable: codeData.postal_code && codeData.status === 'active',
          data: codeData,
        };
      }

      return { success: true, serviceable: false, message: 'Pincode not serviceable' };
    } catch (error) {
      console.error('Delhivery serviceability check error:', error.response?.status || error.message);
      return { success: false, message: 'Delhivery serviceability check failed' };
    }
  }

  // Fetch waybills in bulk
  async fetchWaybills(count = 10) {
    try {
      const configError = this.configurationError(true);
      if (configError) return { success: false, message: configError };
      const url = new URL(this.waybillUrl);
      url.searchParams.set('cl', this.clientName);
      url.searchParams.set('count', String(count));
      const response = await axios.get(url.toString(), {
        headers: { Authorization: `Token ${this.apiToken}` },
        timeout: this.timeout,
      });

      const waybills = this.parseWaybills(response.data);
      if (waybills.length) return { success: true, waybills };
      if (JSON.stringify(response.data || '').includes(this.apiToken)) {
        return {
          success: false,
          message: 'Delhivery returned your API token where a master waybill was expected. Check the waybill API response and account configuration.',
        };
      }

      return {
        success: false,
        message: response.data?.message || 'Delhivery did not return any waybills. Check your account and waybill allocation.',
      };
    } catch (error) {
      console.error('Delhivery waybill fetch error:', error.response?.status || error.message);
      return { success: false, message: 'Delhivery waybill request failed' };
    }
  }

  // Create shipment/order with Delhivery
  async createShipment(orderData) {
    try {
      const configError = this.configurationError(true, true);
      if (configError) return { success: false, message: configError };
      const shipment = {
        name: orderData.consigneeName,
        add: orderData.address,
        pin: orderData.pincode,
        state: orderData.state,
        country: orderData.country || 'India',
        phone: orderData.phone,
        order: orderData.orderId,
        payment_mode: orderData.paymentMode,
        return_address: orderData.returnAddress || this.warehouseName,
        order_type: orderData.orderType || 'forward',
        tags: orderData.tags || [],
        cod_amount: orderData.codAmount || 0,
        weight: orderData.weight || 0.5,
        length: orderData.length || 10,
        breadth: orderData.breadth || 10,
        height: orderData.height || 10,
        quantity: orderData.quantity || 1,
        seller_name: orderData.sellerName || this.clientName,
        seller_add: orderData.sellerAddress || '',
        seller_gst_tin: orderData.sellerGstTin || '',
        client_gst_tin: orderData.clientGstTin || '',
        consignee_gst_tin: orderData.consigneeGstTin || '',
        hsn_code: orderData.hsnCode || '',
        invoice_reference: orderData.invoiceReference || '',
        pickup_location: this.warehouseName,
        fragile_shipment: orderData.fragile || false,
      };
      if (orderData.waybill) {
        const waybill = String(orderData.waybill).trim();
        if (!/^\d+$/.test(waybill) || waybill === this.apiToken) {
          return { success: false, message: 'The supplied Delhivery waybill is invalid; use an eligible Delhivery-issued waybill.' };
        }
        shipment.waybill = waybill;
      }
      if (orderData.shipmentType) shipment.shipment_type = orderData.shipmentType;
      const shipmentPayload = { shipments: [shipment] };

      const response = await axios.post(
        this.apiUrl,
        this.form(shipmentPayload),
        {
          headers: this.headers(),
          timeout: this.timeout,
        }
      );

      const packageResult = response.data?.packages?.[0];
      const confirmedWaybill = response.data?.waybill || packageResult?.waybill || orderData.waybill;
      const packageStatus = String(packageResult?.status || '').toLowerCase();
      const rejected = response.data?.success === false || ['fail', 'failed', 'error', 'invalid'].includes(packageStatus);
      if (confirmedWaybill && !rejected) {
        return {
          success: true,
          waybill: confirmedWaybill,
          orderData: response.data,
        };
      }

      const remarks = packageResult?.remarks;
      const message = this.providerMessage(
        remarks,
        packageResult?.error,
        response.data?.error,
        response.data?.message
      ) || (
        response.data?.success === true
          ? 'Delhivery accepted the shipment request but did not return a waybill. Check the Delhivery panel before retrying.'
          : 'Delhivery rejected the shipment without a readable error message. Check the shipment details and Delhivery account.'
      );
      const indeterminate = /partially saved|might have been saved|may have been saved|package might/i.test(
        `${message} ${JSON.stringify(response.data || {})}`
      );
      return {
        success: false,
        message,
        errors: this.providerMessage(response.data?.error, remarks) || [],
        indeterminate: indeterminate || Boolean(response.data?.success || (packageResult && !rejected)),
      };
    } catch (error) {
      console.error('Delhivery shipment creation error:', error.response?.status || error.message);
      return {
        success: false,
        message: 'Delhivery did not confirm shipment creation. Verify with Delhivery before retrying.',
        indeterminate: !error.response || error.response.status >= 500,
      };
    }
  }

  // Track shipment using waybill
  async trackShipment(waybill) {
    try {
      const configError = this.configurationError();
      if (configError) return { success: false, message: configError };
      const response = await axios.get(
        `${this.trackingUrl}?waybill=${encodeURIComponent(waybill)}`,
        {
          headers: { Authorization: `Token ${this.apiToken}` },
          timeout: this.timeout,
        }
      );

      if (response.data && response.data.ShipmentData) {
        return {
          success: true,
          tracking: response.data.ShipmentData,
        };
      }

      return { success: false, message: 'Tracking information not found' };
    } catch (error) {
      console.error('Delhivery tracking error:', error.response?.status || error.message);
      return { success: false, message: 'Delhivery tracking request failed' };
    }
  }

  // Cancel shipment
  async cancelShipment(waybill) {
    try {
      const configError = this.configurationError();
      if (configError) return { success: false, message: configError };
      const response = await axios.post(
        `${this.baseUrl}/api/cmu/cancel.json`,
        this.form({ waybill: [waybill] }),
        {
          headers: this.headers(),
          timeout: this.timeout,
        }
      );

      if (response.data && (response.data.success === true || response.data.status === true)) {
        return { success: true, message: 'Shipment cancelled successfully' };
      }

      return { success: false, message: response.data?.message || response.data?.remark || 'Failed to cancel shipment' };
    } catch (error) {
      console.error('Delhivery cancellation error:', error.response?.status || error.message);
      return { success: false, message: 'Delhivery cancellation request failed' };
    }
  }

  // Generate shipping label
  async generateLabel(waybill) {
    try {
      const configError = this.configurationError();
      if (configError) return { success: false, message: configError };
      const response = await axios.get(
        `${this.baseUrl}/api/p/packing-slips/json/?waybill=${encodeURIComponent(waybill)}`,
        {
          headers: { Authorization: `Token ${this.apiToken}` },
          responseType: 'arraybuffer',
          timeout: this.timeout,
        }
      );

      const contentType = response.headers['content-type'] || 'application/pdf';
      if (!contentType.toLowerCase().includes('pdf')) {
        return { success: false, message: 'Delhivery did not return a PDF shipping label' };
      }
      return {
        success: true,
        labelData: response.data,
        contentType,
      };
    } catch (error) {
      console.error('Delhivery label generation error:', error.response?.status || error.message);
      return { success: false, message: 'Delhivery label request failed' };
    }
  }

  // Update shipment details
  async updateShipment(waybill, updateData) {
    try {
      const configError = this.configurationError();
      if (configError) return { success: false, message: configError };
      const response = await axios.post(
        `${this.baseUrl}/api/cmu/edit.json`,
        this.form({ waybill, ...updateData }),
        {
          headers: this.headers(),
          timeout: this.timeout,
        }
      );

      if (response.data && response.data.success) {
        return { success: true, message: 'Shipment updated successfully' };
      }

      return { success: false, message: response.data?.message || 'Failed to update shipment' };
    } catch (error) {
      console.error('Delhivery update error:', error.response?.status || error.message);
      return { success: false, message: 'Delhivery shipment update failed' };
    }
  }
}

module.exports = new DelhiveryService();
