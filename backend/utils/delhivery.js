const axios = require('axios');

class DelhiveryService {
  constructor() {
    this.apiToken = process.env.DELHIVERY_API_TOKEN;
    this.clientName = process.env.DELHIVERY_CLIENT_NAME;
    this.warehouseName = process.env.DELHIVERY_WAREHOUSE_NAME;
    this.apiUrl = process.env.DELHIVERY_API_URL || 'https://track.delhivery.com/api/cmu/create.json';
    this.waybillUrl = process.env.DELHIVERY_WAYBILL_URL || 'https://track.delhivery.com/waybill/api/bulk/json';
    this.trackingUrl = process.env.DELHIVERY_TRACKING_URL || 'https://track.delhivery.com/api/v1/track';
  }

  // Check if a pincode is serviceable
  async checkServiceability(pincode) {
    try {
      const response = await axios.get(
        `https://track.delhivery.com/c/api/pin-codes/json/?filter_codes=${pincode}`,
        {
          headers: {
            'Authorization': `Token ${this.apiToken}`,
          },
        }
      );

      if (response.data && response.data.delivery_codes && response.data.delivery_codes.length > 0) {
        const codeData = response.data.delivery_codes[0];
        return {
          serviceable: codeData.postal_code && codeData.status === 'active',
          data: codeData,
        };
      }

      return { serviceable: false, message: 'Pincode not serviceable' };
    } catch (error) {
      console.error('Delhivery serviceability check error:', error.response?.data || error.message);
      return { serviceable: false, error: error.message };
    }
  }

  // Fetch waybills in bulk
  async fetchWaybills(count = 10) {
    try {
      const response = await axios.get(
        `${this.waybillUrl}/?cl=${this.clientName}&token=${this.apiToken}&count=${count}`
      );

      if (response.data && response.data.waybills) {
        return { success: true, waybills: response.data.waybills };
      }

      return { success: false, message: 'Failed to fetch waybills' };
    } catch (error) {
      console.error('Delhivery waybill fetch error:', error.response?.data || error.message);
      return { success: false, error: error.message };
    }
  }

  // Create shipment/order with Delhivery
  async createShipment(orderData) {
    try {
      const shipmentPayload = {
        shipments: [
          {
            name: orderData.consigneeName,
            add: orderData.address,
            pin: orderData.pincode,
            state: orderData.state,
            country: orderData.country || 'India',
            phone: orderData.phone,
            order: orderData.orderId,
            payment_mode: orderData.paymentMode, // 'COD' or 'Prepaid'
            return_address: orderData.returnAddress || this.warehouseName,
            order_type: orderData.orderType || 'forward',
            tags: orderData.tags || [],
            cod_amount: orderData.codAmount || 0,
            weight: orderData.weight || 0.5, // in kg
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
            shipment_type: orderData.shipmentType || 'Single Piece',
            waybill: orderData.waybill || '',
            pickup_location: this.warehouseName,
            fragile_shipment: orderData.fragile || false,
          },
        ],
      };

      const response = await axios.post(
        this.apiUrl,
        `format=json&data=${JSON.stringify(shipmentPayload)}`,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Token ${this.apiToken}`,
          },
        }
      );

      if (response.data && response.data.success) {
        return {
          success: true,
          waybill: response.data.waybill,
          orderData: response.data,
        };
      }

      return {
        success: false,
        message: response.data?.message || 'Failed to create shipment',
        errors: response.data?.error || [],
      };
    } catch (error) {
      console.error('Delhivery shipment creation error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.message,
        details: error.response?.data,
      };
    }
  }

  // Track shipment using waybill
  async trackShipment(waybill) {
    try {
      const response = await axios.get(
        `${this.trackingUrl}?waybill=${waybill}`,
        {
          headers: {
            'Authorization': `Token ${this.apiToken}`,
          },
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
      console.error('Delhivery tracking error:', error.response?.data || error.message);
      return { success: false, error: error.message };
    }
  }

  // Cancel shipment
  async cancelShipment(waybill) {
    try {
      const response = await axios.post(
        'https://track.delhivery.com/api/cmu/cancel.json',
        `format=json&data=${JSON.stringify({ waybill: [waybill] })}`,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Token ${this.apiToken}`,
          },
        }
      );

      if (response.data && response.data.success) {
        return { success: true, message: 'Shipment cancelled successfully' };
      }

      return { success: false, message: response.data?.message || 'Failed to cancel shipment' };
    } catch (error) {
      console.error('Delhivery cancellation error:', error.response?.data || error.message);
      return { success: false, error: error.message };
    }
  }

  // Generate shipping label
  async generateLabel(waybill) {
    try {
      const response = await axios.get(
        `https://track.delhivery.com/api/p/packing-slips/json/?waybill=${waybill}`,
        {
          headers: {
            'Authorization': `Token ${this.apiToken}`,
          },
          responseType: 'arraybuffer',
        }
      );

      return {
        success: true,
        labelData: response.data,
        contentType: response.headers['content-type'],
      };
    } catch (error) {
      console.error('Delhivery label generation error:', error.response?.data || error.message);
      return { success: false, error: error.message };
    }
  }

  // Update shipment details
  async updateShipment(waybill, updateData) {
    try {
      const response = await axios.post(
        'https://track.delhivery.com/api/cmu/edit.json',
        `format=json&data=${JSON.stringify({ waybill, ...updateData })}`,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Token ${this.apiToken}`,
          },
        }
      );

      if (response.data && response.data.success) {
        return { success: true, message: 'Shipment updated successfully' };
      }

      return { success: false, message: response.data?.message || 'Failed to update shipment' };
    } catch (error) {
      console.error('Delhivery update error:', error.response?.data || error.message);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new DelhiveryService();
