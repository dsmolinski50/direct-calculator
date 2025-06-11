// Formatting helpers
function stripNonDigits(s){ return s.replace(/\D/g,""); }
function addCommas(d){ const n=parseInt(d,10)||0; return n.toLocaleString("en-US"); }
function formatCurrency(n){ return "$"+n.toLocaleString(undefined,{minimumFractionDigits:0,maximumFractionDigits:0}); }
function parsePctInputToDecimal(s){ const v=parseFloat(s); return isNaN(v)?0:v/100; }

// Currency‐mask
function attachCurrencyMask(el){
  el.addEventListener("focus", e => e.target.value = stripNonDigits(e.target.value));
  el.addEventListener("input", e => e.target.value = addCommas(stripNonDigits(e.target.value)));
  el.addEventListener("blur", e => {
    const d = stripNonDigits(e.target.value);
    e.target.value = d ? `$${addCommas(d)}` : "";
  });
  // init format
  const init = stripNonDigits(el.value);
  if(init) el.value = `$${addCommas(init)}`;
}

// Simulated AJAX
function simulateAjaxCalculate(input){
  return new Promise(res=>{
    setTimeout(()=>{
      const s  = parseFloat(input.amazonSales)      || 0;
      const cr = parseFloat(input.commissionRate)   || 0;
      const fr = parseFloat(input.fbaRate)          || 0;
      const ar = parseFloat(input.adRate)           || 0;
      const mr = parseFloat(input.mgmtRate)         || 0;
      const rr = parseFloat(input.returnsRate)      || 0;
      const or = parseFloat(input.otherRateDirect)  || 0;
      const wr = parseFloat(input.wholesaleRate)    || 0;
      const adr= parseFloat(input.adRateDist)       || 0;
      const orr= parseFloat(input.otherRateDist)    || 0;

      // Direct calculations
      const commissionAmt     = s * cr;
      const fbaFeesAmt        = s * fr;
      const netRevenue        = s - commissionAmt - fbaFeesAmt;
      const adExpenses        = s * ar;
      const mgmtFee           = s * mr;
      const returnsAmt        = s * rr;
      const otherFeesAmt      = s * or;
      const totalFeesRate     = cr + fr + ar + mr + rr + or;
      const brandProfitDirect = netRevenue - adExpenses - mgmtFee - returnsAmt - otherFeesAmt;

      // Distributor calculations
      const wholesaleAmt      = s * wr;
      const adExpensesDist    = s * adr;
      const otherFeesAmtDist  = s * orr;
      const brandProfitDist   = wholesaleAmt - adExpensesDist - otherFeesAmtDist;
      const difference        = brandProfitDirect - brandProfitDist;

      res({
        commissionAmt,
        fbaFeesAmt,
        netRevenue,
        adExpenses,
        mgmtFee,
        returnsAmt,
        otherFeesAmt,
        totalFeesRate,
        brandProfitDirect,
        wholesaleAmt,
        adExpensesDist,
        otherFeesAmtDist,
        brandProfitDist,
        difference
      });
    },200);
  });
}

// Recalculate all values
async function recalcAll(){
  const dsEl = document.getElementById("direct-amazon-sales");
  const s = parseFloat(stripNonDigits(dsEl.value)) || 0;
  // Mirror to distributor
  const diEl = document.getElementById("dist-amazon-sales");
  diEl.value = addCommas(String(s));
  diEl.dispatchEvent(new Event("blur"));

  // Read percents
  const cr  = parsePctInputToDecimal(document.getElementById("direct-commission-pct").value);
  const fr  = parsePctInputToDecimal(document.getElementById("direct-fba-pct").value);
  const ar  = parsePctInputToDecimal(document.getElementById("direct-ad-pct").value);
  const mr  = parsePctInputToDecimal(document.getElementById("direct-mgmt-pct").value);
  const rr  = parsePctInputToDecimal(document.getElementById("direct-returns-pct").value);
  const or  = parsePctInputToDecimal(document.getElementById("direct-other-pct").value);
  const wr  = parsePctInputToDecimal(document.getElementById("dist-wholesale-pct").value);
  const adr = parsePctInputToDecimal(document.getElementById("dist-ad-pct").value);
  const orr = parsePctInputToDecimal(document.getElementById("dist-other-pct").value);

  // Compute via AJAX simulation
  const r = await simulateAjaxCalculate({
    amazonSales:        s,
    commissionRate:     cr,
    fbaRate:            fr,
    adRate:             ar,
    mgmtRate:           mr,
    returnsRate:        rr,
    otherRateDirect:    or,
    wholesaleRate:      wr,
    adRateDist:         adr,
    otherRateDist:      orr
  });

  // Update Direct outputs
  document.getElementById("direct-commission-amount").textContent = formatCurrency(r.commissionAmt);
  document.getElementById("direct-fba-fees-amt").textContent      = formatCurrency(r.fbaFeesAmt);
  document.getElementById("direct-net-revenue").textContent      = formatCurrency(r.netRevenue);
  document.getElementById("direct-ad-expenses").textContent      = formatCurrency(r.adExpenses);
  document.getElementById("direct-mgmt-fee").textContent         = formatCurrency(r.mgmtFee);
  document.getElementById("direct-returns-amt").textContent      = formatCurrency(r.returnsAmt);
  document.getElementById("direct-other-fees-amt").textContent   = formatCurrency(r.otherFeesAmt);
  document.getElementById("direct-brand-profit").textContent     = formatCurrency(r.brandProfitDirect);
  document.getElementById("direct-net-profit-pct").textContent   = ((1 - r.totalFeesRate)*100).toFixed(1) + "%";

  // Update Distributor outputs
  document.getElementById("dist-wholesale-amt").textContent    = formatCurrency(r.wholesaleAmt);
  document.getElementById("dist-ad-expenses").textContent     = formatCurrency(r.adExpensesDist);
  document.getElementById("dist-other-fees-amt").textContent  = formatCurrency(r.otherFeesAmtDist);
  document.getElementById("dist-brand-profit").textContent    = formatCurrency(r.brandProfitDist);
  document.getElementById("dist-net-profit-pct").textContent  = s 
    ? ((r.brandProfitDist/s)*100).toFixed(1)+"%" 
    : "0.0%";
  document.getElementById("dist-difference").textContent      = formatCurrency(r.difference);
}

// Initialize on load
document.addEventListener("DOMContentLoaded", () => {
  const ds = document.getElementById("direct-amazon-sales");
  const di = document.getElementById("dist-amazon-sales");

  attachCurrencyMask(ds);
  attachCurrencyMask(di);

  ["blur","change"].forEach(evt => {
    ds.addEventListener(evt, recalcAll);
    di.addEventListener(evt, () => {
      // Sync direct to distributor and recalc
      ds.value = di.value;
      ds.dispatchEvent(new Event("blur"));
    });
  });

  document.querySelectorAll(".percent-input").forEach(el => {
    ["blur","change"].forEach(evt => el.addEventListener(evt, recalcAll));
  });

  // Default sales to $2,000,000
  ds.value = "2000000";
  ds.dispatchEvent(new Event("blur"));
  recalcAll();
});
