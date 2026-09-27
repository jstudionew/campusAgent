import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as financeApi from '../../../services/api/finance';
import * as reportsApi from '../../../services/api/reports';

const fetchFinanceAPI = async () => {
  const [summaryRes, paymentsRes] = await Promise.all([
    reportsApi.financeSummary({}),
    financeApi.listUnifiedPayments({ page: 1, pageSize: 10 }),
  ]);

  const total = Number(summaryRes?.totalAmount || 0);
  const collected = Number(summaryRes?.paidAmount || 0);
  const pending = Number(summaryRes?.pendingAmount || 0);
  const overdue = Number(summaryRes?.overdueAmount || 0);

  return {
    feeCollection: {
      total,
      collected,
      pending,
      overdue,
    },
    monthlyStats: [],
    recentPayments: (Array.isArray(paymentsRes?.items) ? paymentsRes.items : []).map((payment) => ({
      id: payment.id,
      studentId: payment.userId,
      amount: Number(payment.amount || 0),
      date: payment.paidAt ? new Date(payment.paidAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      method: payment.method || 'cash',
      status: 'completed',
      studentName: payment.userName || 'Unknown Student',
      feeType: payment.invoiceNumber || 'Fee',
    })),
  };
};

// Async thunks
export const fetchFinanceData = createAsyncThunk('finance/fetchData', async (_, { rejectWithValue }) => {
  try {
    const financeData = await fetchFinanceAPI();
    return financeData;
  } catch (error) {
    return rejectWithValue(error.message || 'Failed to load finance data');
  }
});

export const addPayment = createAsyncThunk('finance/addPayment', async (paymentData, { rejectWithValue }) => {
  try {
    // Replace with actual API call
    const newPayment = { id: Date.now(), ...paymentData, status: 'completed', date: new Date().toISOString().split('T')[0] };
    return newPayment;
  } catch (error) {
    return rejectWithValue(error.message);
  }
});

const initialState = {
  summary: {
    feeCollection: {
      total: 0,
      collected: 0,
      pending: 0,
      overdue: 0,
    },
    monthlyStats: [],
  },
  recentPayments: [],
  feeStructure: {},
  loading: false,
  error: null,
  selectedInvoice: null,
};

const financeSlice = createSlice({
  name: 'finance',
  initialState,
  reducers: {
    setSelectedInvoice: (state, action) => {
      state.selectedInvoice = action.payload;
    },
    clearSelectedInvoice: (state) => {
      state.selectedInvoice = null;
    },
    updateFeeStructure: (state, action) => {
      state.feeStructure = { ...state.feeStructure, ...action.payload };
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch finance data
      .addCase(fetchFinanceData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFinanceData.fulfilled, (state, action) => {
        const { feeCollection, monthlyStats, recentPayments } = action.payload;
        state.summary.feeCollection = feeCollection;
        state.summary.monthlyStats = monthlyStats;
        state.recentPayments = recentPayments;
        state.loading = false;
      })
      .addCase(fetchFinanceData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Add payment
      .addCase(addPayment.pending, (state) => {
        state.loading = true;
      })
      .addCase(addPayment.fulfilled, (state, action) => {
        state.recentPayments.unshift(action.payload);
        
        // Update summary
        state.summary.feeCollection.collected += action.payload.amount;
        state.summary.feeCollection.pending -= action.payload.amount;
        
        // Update monthly stats
        const month = new Date().toLocaleString('default', { month: 'short' });
        const monthIndex = state.summary.monthlyStats.findIndex(stat => stat.month === month);
        
        if (monthIndex !== -1) {
          state.summary.monthlyStats[monthIndex].collected += action.payload.amount;
          state.summary.monthlyStats[monthIndex].pending -= action.payload.amount;
        }
        
        state.loading = false;
      })
      .addCase(addPayment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { setSelectedInvoice, clearSelectedInvoice, updateFeeStructure } = financeSlice.actions;

export default financeSlice.reducer;
