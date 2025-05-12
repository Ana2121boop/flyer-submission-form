// --- COMPLETE UPDATED JAVASCRIPT (Integrates with Backend Filters & Delete) ---

// --- Constants & State ---
const MAX_SOCIAL_ITEMS = 7;
let currentEditProductId = null;
const productDataStore = new Map();
const MAX_FLYER_PRODUCTS = 8;
const MAX_NEW_PAGE_PRODUCTS = 16;
const MAX_ADDITIONAL_PAGES = 8;
let filledFlyerSlots = 0;
let currentAdditionalPagesCount = 0;
let activeCellForEditing = null;
let activeEditingSectionElement = null;
let isCurrentSectionDirty = false;
let currentGlightboxInstance = null;

// --- Admin Dashboard State ---
// allAdminSubmissions will now be populated by the potentially filtered list from the server
// We don't strictly need to store it globally if displaySubmissions is always called directly
// from loadAdminSubmissions with the server's response.
// let allAdminSubmissions = []; 
let selectedSubmissionIds = new Set();

// --- DOM Element References ---
let storeNameInput, submittedByInput, submissionDateElement, lastUpdatedElement,
    startDateInput, endDateInput, generalNotesTextarea, productEditArea, productFormFieldsContainer,
    saveProductBtn, cancelProductBtn, productFormFieldsTemplate,
    productDisplayTemplate, productSubmitErrorElement, productEditErrorElement, socialItemsListDiv,
    socialMediaSection, socialCounterDisplay,
    reqPriceTagsCheckbox, reqPostersCheckbox, reqSignageCheckbox, printNotesTextarea,
    flyerForm, formErrorElement, successModal, modalMessage, modalCloseBtn,
    showAdminLoginBtn, adminSection, adminLogin, adminLoginForm, adminUsername, adminPassword,
    adminLoginError, adminDashboard, adminLogoutBtn, adminSubmissionsList,
    submissionDetailModal, submissionDetailContent, submissionDetailCloseBtn,
    flyerProductsGrid, flyerProductCounterDisplay,
    addNewPageBtn, additionalPagesContainer, newPageSectionTemplate,
    productEditModal, productEditCloseBtn,
    editSaveFlyerBtn;
let deadlineDateDisplayEl, countdownTimerDisplayEl, countdownInterval;
let storeDetailsSection, flyerOptionsContainer, printRequestSection, submitContainer, flyerProductsSection;
let forceSaveModal, forceSaveBtn, forceSaveCancelBtn, forceSaveCloseBtn;
let extractPdfBtn;

// --- Admin Dashboard DOM References ---
let adminGreetingElement, deleteSelectedSubmissionsBtn, selectedSubmissionsCountElement,
    filterDateStartInput, filterDateEndInput, filterStoreNameInput,
    applyFiltersBtn, clearFiltersBtn;


// --- Utility Functions ---
function generateUUID() { return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8); return v.toString(16); }); }
function formatDate(dateStr) { 
    const date = new Date(dateStr);
    if (!(date instanceof Date) || isNaN(date.getTime())) {
        return 'N/A'; 
    }
    // Adjust for potential timezone offset if dateStr is just YYYY-MM-DD from database
    // to avoid off-by-one day issues due to UTC conversion by new Date().
    // This simple adjustment adds local timezone offset if the time part is missing.
    const adjustedDate = new Date(date.valueOf() + date.getTimezoneOffset() * 60 * 1000);
    const y = adjustedDate.getFullYear(), m = (adjustedDate.getMonth() + 1).toString().padStart(2, '0'), d = adjustedDate.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
}
function formatDateTime(dateStr) { 
    const date = new Date(dateStr);
    if (!(date instanceof Date) || isNaN(date.getTime())) {
        return 'N/A';
    }
    const opts = { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true };
    return date.toLocaleString(undefined, opts);
}
function escapeHtml(unsafe) { if (typeof unsafe !== 'string') { if (unsafe === null || typeof unsafe === 'undefined') return ''; try { return String(unsafe); } catch { return ''; } } return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;"); }

// --- Data Store ---
function storeProductData(data) { if (!data || !data.id) return; productDataStore.set(data.id, data); }
function getProductDataById(id) { return productDataStore.get(id); }
function removeProductData(id) { productDataStore.delete(id); }

// --- Product Specific Functions (calculateDiscount to updateDynamicPageCounter) ---
// These functions remain unchanged from your original provided code.
// For brevity, I'm not re-listing them all here but assume they are present.
function calculateDiscount(formArea) { if (!formArea) return; const regularPriceInput = formArea.querySelector('input[name="regularPrice"]'); const salePriceInput = formArea.querySelector('input[name="salePrice"]'); const discountInput = formArea.querySelector('input[name="discountPercent"]'); const manualDiscountFieldContainer = formArea.querySelector('.manual-discount-field'); const manualDiscountInput = formArea.querySelector('input[name="manualDiscountDescription"]'); if (!regularPriceInput || !salePriceInput || !discountInput || !manualDiscountFieldContainer || !manualDiscountInput) { console.error("calculateDiscount: Missing required elements."); return; } regularPriceInput.setCustomValidity(""); salePriceInput.setCustomValidity(""); discountInput.value = ''; const regularPrice = parseFloat(regularPriceInput.value); const salePrice = parseFloat(salePriceInput.value); const regularPriceIsZero = regularPriceInput.value.trim() === "0" || regularPriceInput.value.trim() === "0.0" || regularPriceInput.value.trim() === "0.00"; const salePriceIsZero = salePriceInput.value.trim() === "0" || salePriceInput.value.trim() === "0.0" || salePriceInput.value.trim() === "0.00"; const bothAreValidZero = regularPriceIsZero && salePriceIsZero && !isNaN(regularPrice) && !isNaN(salePrice) && regularPrice === 0 && salePrice === 0; if (bothAreValidZero) { discountInput.placeholder = "N/A"; discountInput.value = "N/A"; discountInput.readOnly = true; manualDiscountFieldContainer.style.display = 'block'; manualDiscountInput.disabled = false; manualDiscountInput.readOnly = false; } else { manualDiscountFieldContainer.style.display = 'none'; manualDiscountInput.disabled = true; manualDiscountInput.readOnly = true; manualDiscountInput.value = ""; discountInput.readOnly = true; discountInput.placeholder = "Auto-calculated"; let autoCalcError = false; if (regularPriceInput.value.trim() !== "" && (isNaN(regularPrice) || regularPrice <= 0)) { regularPriceInput.setCustomValidity("Regular price must be > 0 for auto-calculation."); discountInput.value = "N/A"; autoCalcError = true; } if (!autoCalcError && salePriceInput.value.trim() !== "" && isNaN(salePrice)) { salePriceInput.setCustomValidity("Invalid number entered for sale price."); discountInput.value = "Error"; autoCalcError = true; } if (!autoCalcError && !isNaN(regularPrice) && regularPrice > 0 && !isNaN(salePrice)) { if (salePrice < 0) { salePriceInput.setCustomValidity("Sale price must be non-negative."); discountInput.value = "Error"; } else if (salePrice >= regularPrice) { if (salePriceInput.value.trim() !== "") { salePriceInput.setCustomValidity("Sale price must be less than regular price for discount."); discountInput.value = "Error"; } else { discountInput.value = "0.0%"; } } else { discountInput.value = (((regularPrice - salePrice) / regularPrice) * 100).toFixed(1) + '%'; } } else if (!autoCalcError) { discountInput.value = ""; } } }
function handleImagePreview(event, previewContainer) { const input = event.target; if (!previewContainer || !input || !input.files) { if(previewContainer) previewContainer.innerHTML = '<small>No image selected.</small>'; return; } previewContainer.innerHTML = '<small>No image selected.</small>'; if (input.files && input.files[0]) { const file = input.files[0]; if (!file.type.startsWith('image/')) { previewContainer.innerHTML = '<small style="color: red;">Invalid file type.</small>'; input.value = ''; return; } const maxSizeMB = 5; if (file.size > maxSizeMB * 1024 * 1024) { previewContainer.innerHTML = `<small style="color: red;">File too large (Max ${maxSizeMB}MB).</small>`; input.value = ''; return; } const reader = new FileReader(); reader.onload = function(e) { if (!e.target?.result) return; previewContainer.innerHTML = ''; const img = document.createElement('img'); img.src = e.target.result; img.alt = "Image Preview"; img.style.cssText = 'max-width:100px; max-height:100px; margin-right:5px; border:1px solid #ddd; border-radius:3px;'; const fileNameSpan = document.createElement('span'); fileNameSpan.textContent = ` (${file.name})`; previewContainer.appendChild(img); previewContainer.appendChild(fileNameSpan); }; reader.onerror = function() { console.error("File reading error:", reader.error); previewContainer.innerHTML = '<small style="color: red;">Error reading file.</small>'; input.value = ''; }; reader.readAsDataURL(file); } }
function showProductForm() { console.log("DEBUG: showProductForm CALLED! Editing ID:", currentEditProductId); if (!productFormFieldsContainer || !productFormFieldsTemplate || !productEditArea || !saveProductBtn || !cancelProductBtn || !productEditErrorElement || !productEditModal) { console.error("ShowProductForm Error: Essential elements missing!"); alert("Error: Could not display product form."); return; } productEditErrorElement.style.display = 'none'; productFormFieldsContainer.innerHTML = ''; const formFieldsFragment = productFormFieldsTemplate.content.cloneNode(true); const manualDiscountInputInFragment = formFieldsFragment.querySelector('input[name="manualDiscountDescription"]'); const includeSocialCheckboxInFragment = formFieldsFragment.querySelector('input[name="includeInSocial"]'); let isEditingExistingSocial = false; let currentSocialCount = 0; productDataStore.forEach(p => { if (p.includeInSocial) { currentSocialCount++; if (p.id === currentEditProductId) isEditingExistingSocial = true; } }); if (currentEditProductId) { const productData = getProductDataById(currentEditProductId); if (productData) { const setVal=(s,v)=>{const e=formFieldsFragment.querySelector(s);if(e)e.value=(v!==undefined&&v!==null)?v:''}; const setChecked=(s,c)=>{const e=formFieldsFragment.querySelector(s);if(e)e.checked=c||!1}; setVal('input[name="productName"]',productData.productName); setVal('input[name="brandName"]',productData.brandName); setVal('select[name="category"]',productData.category); setVal('input[name="sizeDimensions"]',productData.sizeDimensions); setVal('input[name="colourFinish"]',productData.colourFinish); setVal('input[name="sku"]',productData.sku); setVal('input[name="regularPrice"]',productData.regularPrice); setVal('input[name="salePrice"]',productData.salePrice); if (manualDiscountInputInFragment && productData.manualDiscountDescription) { manualDiscountInputInFragment.value = productData.manualDiscountDescription; } setChecked('input[name="isMainFlyerProduct"]',productData.isMainFlyerProduct); setChecked('input[name="isBundle"]',productData.isBundle); setVal('textarea[name="bundleItems"]',productData.bundleItems); setChecked('input[name="requestStockImage"]',productData.requestStockImage); if (includeSocialCheckboxInFragment) { setChecked('input[name="includeInSocial"]', productData.includeInSocial); } const bundleCheckboxPopulated=formFieldsFragment.querySelector('.bundle-checkbox'); const bundleItemsDivPopulated=formFieldsFragment.querySelector('.bundle-items-container'); const bundleTextareaPopulated=bundleItemsDivPopulated?.querySelector('textarea[name="bundleItems"]'); if(bundleCheckboxPopulated&&bundleItemsDivPopulated&&bundleTextareaPopulated){ bundleItemsDivPopulated.style.display=productData.isBundle?'block':'none'; bundleTextareaPopulated.required=productData.isBundle; } const previewDivPopulated=formFieldsFragment.querySelector('.image-preview'); if(productData.imageDataUrl&&previewDivPopulated){ previewDivPopulated.innerHTML=''; const i=document.createElement('img');i.src=productData.imageDataUrl;i.alt="Image Preview";i.style.cssText='max-width:100px;max-height:100px;margin-right:5px;border:1px solid #ddd;border-radius:3px;'; const s=document.createElement('span');s.textContent=` (${productData.imageFileName||'Stored Image'})`; previewDivPopulated.appendChild(i);previewDivPopulated.appendChild(s) } else if(previewDivPopulated) { previewDivPopulated.innerHTML='<small>No image selected.</small>'; } const imageInputPopulated=formFieldsFragment.querySelector('.product-image-input'); if(imageInputPopulated) imageInputPopulated.value=''; } else { console.warn("Edit requested but no data for ID:", currentEditProductId); currentEditProductId = null; } } if (includeSocialCheckboxInFragment) { if (currentSocialCount >= MAX_SOCIAL_ITEMS && !isEditingExistingSocial) { includeSocialCheckboxInFragment.disabled = true; includeSocialCheckboxInFragment.title = `Cannot add: ${MAX_SOCIAL_ITEMS} items already selected for social media.`; const label = includeSocialCheckboxInFragment.closest('label'); if (label) { label.style.opacity = '0.6'; label.style.cursor = 'not-allowed'; label.title = includeSocialCheckboxInFragment.title; } } else { includeSocialCheckboxInFragment.disabled = false; includeSocialCheckboxInFragment.title = ''; const label = includeSocialCheckboxInFragment.closest('label'); if (label) { label.style.opacity = '1'; label.style.cursor = 'pointer'; label.title = ''; } } } const priceInputs = formFieldsFragment.querySelectorAll('.price-input'); priceInputs.forEach(input => { input.addEventListener('input', () => calculateDiscount(productFormFieldsContainer)); }); const bundleCheckbox = formFieldsFragment.querySelector('.bundle-checkbox'); const bundleItemsDiv = formFieldsFragment.querySelector('.bundle-items-container'); if (bundleCheckbox && bundleItemsDiv) { const bundleTextarea = bundleItemsDiv.querySelector('textarea[name="bundleItems"]'); bundleCheckbox.addEventListener('change', (e) => { bundleItemsDiv.style.display = e.target.checked ? 'block' : 'none'; if(bundleTextarea) bundleTextarea.required = e.target.checked; }); if (!currentEditProductId || !getProductDataById(currentEditProductId)?.isBundle) { bundleItemsDiv.style.display = bundleCheckbox.checked ? 'block' : 'none'; if(bundleTextarea) bundleTextarea.required = bundleCheckbox.checked; } } const imageInput = formFieldsFragment.querySelector('.product-image-input'); const previewDiv = formFieldsFragment.querySelector('.image-preview'); if (imageInput && previewDiv) { imageInput.addEventListener('change', (event) => handleImagePreview(event, previewDiv)); } productFormFieldsContainer.appendChild(formFieldsFragment); calculateDiscount(productFormFieldsContainer); productEditModal.classList.add('visible'); saveProductBtn.removeEventListener('click', saveProduct); cancelProductBtn.removeEventListener('click', cancelProductEdit); saveProductBtn.addEventListener('click', saveProduct); cancelProductBtn.addEventListener('click', cancelProductEdit); productFormFieldsContainer.querySelector('input, select, textarea')?.focus(); }
function hideProductForm() { if (productFormFieldsContainer) { productFormFieldsContainer.innerHTML = ''; } if(productEditModal) { productEditModal.classList.remove('visible'); } currentEditProductId = null; activeCellForEditing = null; console.log("Product form hidden."); }
function cancelProductEdit() { hideProductForm(); }
function saveProduct() { if (!productFormFieldsContainer || !productEditErrorElement) { console.error("Save Error: Form elements missing."); return; } productEditErrorElement.style.display = 'none'; let isValid = true; let firstInvalidElement = null; productFormFieldsContainer.querySelectorAll('.invalid').forEach(el => el.classList.remove('invalid')); const inputsToCheck = productFormFieldsContainer.querySelectorAll('input[required]:not([type="checkbox"]), select[required], textarea[required]'); inputsToCheck.forEach(input => { if (!input.checkValidity()) { isValid = false; input.classList.add('invalid'); if (!firstInvalidElement) firstInvalidElement = input; } }); const salePriceInput = productFormFieldsContainer.querySelector('input[name="salePrice"]'); if(salePriceInput) { calculateDiscount(productFormFieldsContainer); if (!salePriceInput.checkValidity()) { isValid = false; salePriceInput.classList.add('invalid'); if (!firstInvalidElement) firstInvalidElement = salePriceInput; } } const bundleCheckbox = productFormFieldsContainer.querySelector('.bundle-checkbox'); const bundleTextarea = productFormFieldsContainer.querySelector('textarea[name="bundleItems"]'); if (bundleCheckbox?.checked && bundleTextarea) { if (!bundleTextarea.checkValidity()) { isValid = false; bundleTextarea.classList.add('invalid'); if (!firstInvalidElement) firstInvalidElement = bundleTextarea; } } const includeSocialCheckbox = productFormFieldsContainer.querySelector('input[name="includeInSocial"]'); const wantsToIncludeInSocial = includeSocialCheckbox?.checked || false; const editingProductId = currentEditProductId; if (wantsToIncludeInSocial) { let currentSocialCount = 0; let isAlreadyIncluded = false; productDataStore.forEach(p => { if (p.includeInSocial) { currentSocialCount++; if (p.id === editingProductId) isAlreadyIncluded = true; } }); if (currentSocialCount >= MAX_SOCIAL_ITEMS && !isAlreadyIncluded) { isValid = false; productEditErrorElement.textContent = `Cannot add: ${MAX_SOCIAL_ITEMS} items already selected.`; productEditErrorElement.style.display = 'block'; includeSocialCheckbox.checked = false; includeSocialCheckbox.classList.add('invalid'); if (!firstInvalidElement) firstInvalidElement = includeSocialCheckbox; } } if (!isValid) { productEditErrorElement.textContent = productEditErrorElement.textContent || 'Please correct highlighted fields.'; productEditErrorElement.style.display = 'block'; firstInvalidElement?.focus(); if (salePriceInput?.validationMessage) salePriceInput.reportValidity(); if (bundleTextarea?.validationMessage) bundleTextarea.reportValidity(); return; } const uniqueId = editingProductId || generateUUID(); const productData = { id: uniqueId }; try { const getValue=(s)=>productFormFieldsContainer?.querySelector(s)?.value?.trim()||''; const getChecked=(s)=>productFormFieldsContainer?.querySelector(s)?.checked||!1; const getFloat=(s)=>{const v=parseFloat(productFormFieldsContainer?.querySelector(s)?.value); return isNaN(v)?undefined:v}; productData.productName=getValue('input[name="productName"]'); productData.brandName=getValue('input[name="brandName"]'); productData.category=getValue('select[name="category"]'); productData.sizeDimensions=getValue('input[name="sizeDimensions"]'); productData.colourFinish=getValue('input[name="colourFinish"]'); productData.sku=getValue('input[name="sku"]'); productData.regularPrice=getFloat('input[name="regularPrice"]'); productData.salePrice=getFloat('input[name="salePrice"]'); productData.discountPercent = getValue('input[name="discountPercent"]'); const manualDiscountInputElement = productFormFieldsContainer.querySelector('input[name="manualDiscountDescription"]'); const manualDiscountContainerElement = productFormFieldsContainer.querySelector('.manual-discount-field'); if (manualDiscountInputElement && manualDiscountContainerElement && manualDiscountContainerElement.style.display !== 'none') { productData.manualDiscountDescription = manualDiscountInputElement.value.trim(); if (productData.regularPrice === 0 && productData.salePrice === 0) { productData.discountPercent = "N/A (Manual)"; } } else { productData.manualDiscountDescription = ""; } productData.specialFeatures=getValue('textarea[name="specialFeatures"]'); productData.isMainFlyerProduct=getChecked('input[name="isMainFlyerProduct"]'); productData.isBundle=getChecked('input[name="isBundle"]'); productData.bundleItems=getValue('textarea[name="bundleItems"]'); productData.requestStockImage=getChecked('input[name="requestStockImage"]'); productData.includeInSocial = wantsToIncludeInSocial; const imageInput=productFormFieldsContainer.querySelector('.product-image-input'); const previewImg=productFormFieldsContainer.querySelector('.image-preview img'); if(imageInput?.files&&imageInput.files[0]){ const f=imageInput.files[0]; productData.imageFileName=f.name; if(previewImg&&previewImg.src.startsWith('data:image')){productData.imageDataUrl=previewImg.src} } else if(editingProductId){ const d=getProductDataById(editingProductId); if(d){productData.imageFileName=d.imageFileName; productData.imageDataUrl=d.imageDataUrl} } else{ productData.imageFileName=undefined; productData.imageDataUrl=undefined } if(!productData.isBundle){productData.bundleItems=undefined} } catch (e){ console.error("Error gathering product data:",e); productEditErrorElement.textContent='Error processing form data.'; productEditErrorElement.style.display='block'; return } storeProductData(productData); if (activeCellForEditing) { const productDisplayClone = productDisplayTemplate.content.cloneNode(true); const productItemDiv = productDisplayClone.querySelector('.product-item'); populateProductDisplayCell(productItemDiv, productData); activeCellForEditing.innerHTML = ''; activeCellForEditing.appendChild(productItemDiv); activeCellForEditing.classList.remove('product-placeholder-cell'); const parentGrid = activeCellForEditing.closest('.products-grid-container'); if (parentGrid === flyerProductsGrid) { updateFlyerProductCounter(); } else if (parentGrid) { const pageSection = parentGrid.closest('.page-section'); if (pageSection) { updateDynamicPageCounter(pageSection); } } } hideProductForm(); renderSocialMediaList(); if (productSubmitErrorElement) productSubmitErrorElement.style.display = 'none'; if (activeEditingSectionElement) { isCurrentSectionDirty = true; activeEditingSectionElement.dataset.dirty = 'true'; updateFormDisabledState(); } console.log("Product saved/updated:", productData.id); }
function populateProductDisplayCell(productItemElement, data) { if (!productItemElement || !data) return; productItemElement.setAttribute('data-product-id', data.id); const displayContentDiv = productItemElement.querySelector('.product-display-content'); const previewImgElement = productItemElement.querySelector('.product-preview-img'); if (displayContentDiv) { const formatPrice = (p) => (p !== undefined && p !== null && !isNaN(p)) ? p.toFixed(2) : 'N/A'; const text = (t) => escapeHtml(t) || 'N/A'; let priceDisplay; if (data.regularPrice === 0 && data.salePrice === 0 && data.manualDiscountDescription) { priceDisplay = `<strong>Discount:</strong> ${text(data.manualDiscountDescription)}`; } else { priceDisplay = `<strong>Price:</strong> Reg $${formatPrice(data.regularPrice)} / Sale $${formatPrice(data.salePrice)}${data.discountPercent && !data.discountPercent.startsWith("N/A") ? ` <span class="product-tag discount-tag">${text(data.discountPercent)}</span>` : ''}`; } displayContentDiv.innerHTML = `<h4>${text(data.productName)} (${text(data.brandName)})</h4><p><strong>Category:</strong> ${text(data.category)}</p><p>${priceDisplay}</p>${data.sku ? `<p><strong>SKU:</strong> ${text(data.sku)}</p>` : ''}${data.sizeDimensions ? `<p><strong>Size:</strong> ${text(data.sizeDimensions)}</p>` : ''}${data.colourFinish ? `<p><strong>Colour:</strong> ${text(data.colourFinish)}</p>` : ''}${data.isMainFlyerProduct ? `<span class="product-tag main-flyer-tag">Main Flyer</span>` : ''} ${data.isBundle ? `<span class="product-tag bundle-tag">Bundle</span> ${data.bundleItems ? `(${text(data.bundleItems)})` : ''}`: ''} ${data.requestStockImage ? `<span class="product-tag stock-image-tag">Req Stock Img</span>` : ''}`; } if (previewImgElement) { if (data.imageDataUrl) { previewImgElement.src = data.imageDataUrl; previewImgElement.alt = data.productName || 'Product Preview'; previewImgElement.style.display = 'block'; } else { previewImgElement.style.display = 'none'; previewImgElement.src = ''; previewImgElement.alt = 'Product Preview'; } } const editBtn = productItemElement.querySelector('.edit-product-btn'); const removeBtn = productItemElement.querySelector('.remove-item-btn'); if (editBtn) { editBtn.removeEventListener('click', handleEditProduct); editBtn.addEventListener('click', handleEditProduct); } if (removeBtn) { removeBtn.removeEventListener('click', handleProductCellRemove); removeBtn.addEventListener('click', handleProductCellRemove); } }
function handleEditProduct(event) { const productItemDiv = event.target.closest('.product-item[data-product-id]'); if (!productItemDiv) return; const productId = productItemDiv.getAttribute('data-product-id'); if (!productId) return; currentEditProductId = productId; activeCellForEditing = productItemDiv.parentNode; showProductForm(); }
function handleProductCellRemove(event) { const productItemDiv = event.target.closest('.product-item[data-product-id]'); if (productItemDiv && window.confirm('Remove product?')) { const productIdToRemove = productItemDiv.getAttribute('data-product-id'); const parentCell = productItemDiv.parentNode; const gridContainer = parentCell.closest('.products-grid-container'); const sectionElement = gridContainer?.closest('.page-section, .flyer-products-section'); parentCell.innerHTML = ''; const placeholderContent = createPlaceholderCell(); parentCell.appendChild(placeholderContent.firstElementChild); parentCell.classList.add('product-placeholder-cell'); if (productIdToRemove) { removeProductData(productIdToRemove); } if (gridContainer === flyerProductsGrid) { updateFlyerProductCounter(); } else if (gridContainer && sectionElement) { updateDynamicPageCounter(sectionElement); } renderSocialMediaList(); if (sectionElement && sectionElement === activeEditingSectionElement) { isCurrentSectionDirty = true; sectionElement.dataset.dirty = 'true'; updateFormDisabledState(); } console.log(`Product removed: ${productIdToRemove || 'Unknown ID'}`); } }
function createPlaceholderCell() { const cell = document.createElement('div'); cell.classList.add('product-item', 'product-placeholder-cell'); const addButton = document.createElement('button'); addButton.type = 'button'; addButton.classList.add('add-product-in-cell-btn', 'button'); addButton.textContent = '+ Add Product'; addButton.addEventListener('click', () => { const parentSection = cell.closest('.page-section, .flyer-products-section'); if (activeEditingSectionElement && activeEditingSectionElement !== parentSection && isCurrentSectionDirty) { showForceSaveModal(); return; } activeCellForEditing = cell; currentEditProductId = null; showProductForm(); }); cell.appendChild(addButton); return cell; }
function updateFlyerProductCounter() { if (flyerProductCounterDisplay && flyerProductsGrid) { filledFlyerSlots = flyerProductsGrid.querySelectorAll('.product-item[data-product-id]').length; flyerProductCounterDisplay.textContent = `Slots Filled: ${filledFlyerSlots} / ${MAX_FLYER_PRODUCTS}`; } }
function updateDynamicPageCounter(pageSectionElement) { if(!pageSectionElement) return; const counterP = pageSectionElement.querySelector('.page-product-counter'); const gridContainer = pageSectionElement.querySelector('.new-page-grid'); if(counterP && gridContainer){ const filledSlotsInGrid = gridContainer.querySelectorAll('.product-item[data-product-id]').length; counterP.textContent = `Slots Filled: ${filledSlotsInGrid} / ${MAX_NEW_PAGE_PRODUCTS}`; } }

// --- Page Management Functions --- (initializeFlyerGrid to togglePageEditMode) ---
// These functions remain unchanged from your original provided code.
// For brevity, I'm not re-listing them all here but assume they are present.
function initializeFlyerGrid() { if (!flyerProductsGrid) return; flyerProductsGrid.innerHTML = ''; for (let i = 0; i < MAX_FLYER_PRODUCTS; i++) { flyerProductsGrid.appendChild(createPlaceholderCell()); } const flyerSection = flyerProductsGrid.closest('.flyer-products-section'); if (flyerSection) { flyerSection.dataset.editing = 'true'; flyerSection.dataset.dirty = 'false'; const editSaveBtn = flyerSection.querySelector('#editSaveFlyerBtn'); if(editSaveBtn && editSaveBtn.dataset.mode !== 'save'){ editSaveBtn.textContent = 'Save Page'; editSaveBtn.dataset.mode = 'save'; editSaveBtn.classList.remove('button-secondary'); editSaveBtn.classList.add('button-primary'); } const reminderNote = flyerSection.querySelector('.save-reminder-note'); if(reminderNote) reminderNote.style.display = 'none'; } updateFlyerProductCounter(); }
function initializeNewPageGrid(gridContainer, pageProductCounterDisplay, maxSlots) { if (!gridContainer || !pageProductCounterDisplay) return; gridContainer.innerHTML = ''; for (let i = 0; i < maxSlots; i++) { gridContainer.appendChild(createPlaceholderCell()); } pageProductCounterDisplay.textContent = `Slots Filled: 0 / ${maxSlots}`; const pageSection = gridContainer.closest('.page-section'); if(pageSection) { pageSection.dataset.editing = 'true'; pageSection.dataset.dirty = 'false'; const reminderNote = pageSection.querySelector('.save-reminder-note'); if(reminderNote) reminderNote.style.display = 'none'; } }
function handleRemovePage(event) { const pageSectionToRemove = event.target.closest('.page-section'); if (pageSectionToRemove && window.confirm("Remove this page and its products?")) { let socialListNeedsUpdate = false; pageSectionToRemove.querySelectorAll('.product-item[data-product-id]').forEach(item => { const productId = item.getAttribute('data-product-id'); if (productId) { const productData = getProductDataById(productId); if (productData?.includeInSocial) socialListNeedsUpdate = true; removeProductData(productId); } }); const wasActive = activeEditingSectionElement === pageSectionToRemove; pageSectionToRemove.remove(); currentAdditionalPagesCount--; if (addNewPageBtn) addNewPageBtn.disabled = false; if (wasActive) { activeEditingSectionElement = null; isCurrentSectionDirty = false; updateFormDisabledState(); } if (socialListNeedsUpdate) renderSocialMediaList(); console.log("Page removed."); } }
function togglePageEditMode(event) { const button = event.target; const sectionElement = button.closest('.page-section, .flyer-products-section'); if (!sectionElement) return; const currentMode = button.dataset.mode; const reminderNote = sectionElement.querySelector('.save-reminder-note'); if (currentMode === 'edit') { if (activeEditingSectionElement && activeEditingSectionElement !== sectionElement && isCurrentSectionDirty) { showForceSaveModal(); return; } else if (activeEditingSectionElement && activeEditingSectionElement !== sectionElement) { const previousSaveButton = activeEditingSectionElement.querySelector('.edit-save-page-btn'); if (previousSaveButton) { previousSaveButton.textContent = 'Edit Page'; previousSaveButton.dataset.mode = 'edit'; previousSaveButton.classList.remove('button-primary'); previousSaveButton.classList.add('button-secondary'); } activeEditingSectionElement.dataset.editing = 'false'; activeEditingSectionElement.querySelectorAll('.add-product-in-cell-btn').forEach(btn => btn.style.display = 'none'); const previousReminderNote = activeEditingSectionElement.querySelector('.save-reminder-note'); if(previousReminderNote) previousReminderNote.style.display = 'none'; activeEditingSectionElement.querySelectorAll('.product-item-actions .edit-product-btn, .product-item-actions .remove-item-btn').forEach(btn => btn.style.display = 'none'); } button.textContent = 'Save Page'; button.dataset.mode = 'save'; button.classList.remove('button-secondary'); button.classList.add('button-primary'); sectionElement.dataset.editing = 'true'; activeEditingSectionElement = sectionElement; isCurrentSectionDirty = sectionElement.dataset.dirty === 'true'; updateFormDisabledState(); } else { showSuccessModal(`Page "${sectionElement.querySelector('h2, h3')?.textContent}" changes saved.`); button.textContent = 'Edit Page'; button.dataset.mode = 'edit'; button.classList.remove('button-primary'); button.classList.add('button-secondary'); sectionElement.dataset.editing = 'false'; sectionElement.dataset.dirty = 'false'; isCurrentSectionDirty = false; if(reminderNote) reminderNote.style.display = 'none'; activeEditingSectionElement = null; updateFormDisabledState(); } }

// --- Social Media List Rendering Function ---
function renderSocialMediaList() { if (!socialItemsListDiv || !socialCounterDisplay) { console.error("Cannot render social media list: Target elements missing."); return; } socialItemsListDiv.innerHTML = ''; let socialCount = 0; const itemsHtml = []; productDataStore.forEach(product => { if (product.includeInSocial) { socialCount++; itemsHtml.push(` <div class="social-list-item" data-product-id="${escapeHtml(product.id)}"> ${product.imageDataUrl ? `<img src="${escapeHtml(product.imageDataUrl)}" alt="Preview" class="social-item-img">` : '<span class="social-item-no-img"></span>'} <div class="social-item-info"> <strong>${escapeHtml(product.productName)}</strong> (${escapeHtml(product.brandName || 'N/A')}) <br><small>Category: ${escapeHtml(product.category || 'N/A')}</small> ${product.sku ? `<br><small>SKU: ${escapeHtml(product.sku)}</small>` : ''} </div> </div> `); } }); socialItemsListDiv.innerHTML = itemsHtml.join(''); socialCounterDisplay.textContent = `Items selected: ${socialCount} / ${MAX_SOCIAL_ITEMS}`; if (socialCount > MAX_SOCIAL_ITEMS) { socialCounterDisplay.classList.add('warning'); socialCounterDisplay.title = 'Warning: Maximum number of social media items exceeded!'; } else { socialCounterDisplay.classList.remove('warning'); socialCounterDisplay.title = ''; } console.log("Social media list rendered, count:", socialCount); }

// --- Modal Functions ---
function showSuccessModal(message) { if (modalMessage) modalMessage.textContent = message; if (successModal) successModal.classList.add('visible'); else alert(message + "\n(Modal failed.)"); }
function closeSuccessModal() { if (successModal) { successModal.classList.remove('visible'); } }

// --- Product Pagination ---
function setupProductPagination(containerElement, pageIndicatorElement, prevButton, nextButton) {
    const pages = containerElement.querySelectorAll('.product-page');
    console.log('[PAGINATION] Initializing. Found pages:', pages.length);
    if (pages.length === 0) { if (pageIndicatorElement) pageIndicatorElement.style.display = 'none'; if (prevButton) prevButton.style.display = 'none'; if (nextButton) nextButton.style.display = 'none'; return; }
    let currentPage = 1; const totalPages = pages.length;
    function updatePageDisplay() {
        console.log(`[PAGINATION] Updating display for page ${currentPage} of ${totalPages}.`);
        pages.forEach((page, index) => { page.style.display = (index + 1) === currentPage ? 'block' : 'none'; });
        if (pageIndicatorElement) { pageIndicatorElement.textContent = `Page ${currentPage} of ${totalPages}`; pageIndicatorElement.style.display = (totalPages > 1) ? 'inline' : 'none'; }
        if (prevButton) { prevButton.disabled = currentPage === 1; prevButton.style.display = (totalPages > 1) ? 'inline-block' : 'none'; }
        if (nextButton) { nextButton.disabled = currentPage === totalPages; nextButton.style.display = (totalPages > 1) ? 'inline-block' : 'none'; }
        const productSectionHeader = document.querySelector('#submissionDetailContent .modal-column-products h3');
        const scrollableModalContent = submissionDetailModal.querySelector('.modal-box') || submissionDetailContent; 
        if (productSectionHeader && scrollableModalContent.contains(productSectionHeader)) {
             scrollableModalContent.scrollTop = productSectionHeader.offsetTop - 20; 
        } else if (containerElement.offsetParent) { 
            containerElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }
    if (prevButton) { const newPrevButton = prevButton.cloneNode(true); prevButton.parentNode.replaceChild(newPrevButton, prevButton); prevButton = newPrevButton; prevButton.addEventListener('click', () => { if (currentPage > 1) { currentPage--; updatePageDisplay(); } }); }
    if (nextButton) { const newNextButton = nextButton.cloneNode(true); nextButton.parentNode.replaceChild(newNextButton, nextButton); nextButton = newNextButton; nextButton.addEventListener('click', () => { if (currentPage < totalPages) { currentPage++; updatePageDisplay(); } }); }
    updatePageDisplay();
}

// --- Submission Detail Modal ---
function showSubmissionDetailModal(submissionData) {
    console.log('--- MODAL: showSubmissionDetailModal START (Horizontal Layout) ---');
    if (!submissionDetailModal || !submissionDetailContent || !submissionDetailCloseBtn) { console.error("MODAL: Essential modal elements not found!"); return; }
    submissionDetailContent.innerHTML = '';
    submissionDetailModal.classList.add('visible');
    const formData = submissionData?.form_data || {};
    const submittedAt = submissionData?.submitted_at ? formatDateTime(submissionData.submitted_at) : 'N/A';
    const submissionId = submissionData?.id || 'N/A';
    const column1 = document.createElement('div');
    column1.className = 'modal-column modal-column-details';
    let col1Html = `<div class="submission-meta section-container">
                        <p><strong>Submission ID:</strong> ${escapeHtml(submissionId)}</p>
                        <p><strong>Submitted At:</strong> ${escapeHtml(submittedAt)}</p>
                        <hr class="subtle-hr">
                        <p><strong>Store Name:</strong> ${escapeHtml(formData.storeName || 'N/A')}</p>
                        <p><strong>Submitted By:</strong> ${escapeHtml(formData.submittedBy || 'N/A')}</p>
                        <hr class="subtle-hr">
                        <p><strong>Flyer Start Date:</strong> ${escapeHtml(formData.flyerValidStartDate ? formatDate(formData.flyerValidStartDate) : 'N/A')}</p>
                        <p><strong>Flyer End Date:</strong> ${escapeHtml(formData.flyerValidEndDate ? formatDate(formData.flyerValidEndDate) : 'N/A')}</p>
                        <hr class="subtle-hr">
                        <p><strong>Canada Post Flyer:</strong> ${formData.canadaPostFlyer ? 'Yes' : 'No'}</p>
                        <p><strong>Digital/In-Store Flyer:</strong> ${formData.digitalInStoreFlyer ? 'Yes' : 'No'}</p>
                     </div>`;
    col1Html += `<div class="submission-notes section-container">
                      <h3>General Notes:</h3>
                      <pre class="notes-content">${escapeHtml(formData.generalNotes) || 'No general notes provided.'}</pre>
                   </div>`;
    column1.innerHTML = col1Html;
    submissionDetailContent.appendChild(column1);
    const column2 = document.createElement('div');
    column2.className = 'modal-column modal-column-products';
    const productsOuterContainer = document.createElement('div');
    productsOuterContainer.id = 'modal-product-display-area';
    productsOuterContainer.innerHTML = `<h3>Products</h3>`;
    const products = formData.products || [];
    if (products.length > 0) {
        const productPagesHost = document.createElement('div');
        productPagesHost.id = 'modal-product-pages-host';
        const FLYER_PAGE_SIZE = MAX_FLYER_PRODUCTS || 8;
        const ADDITIONAL_PAGE_SIZE = MAX_NEW_PAGE_PRODUCTS || 16;
        let productIndex = 0; let pageNumber = 1; const MAX_PAGES_TO_GENERATE = 1 + (MAX_ADDITIONAL_PAGES || 8);
        while (productIndex < products.length && pageNumber <= MAX_PAGES_TO_GENERATE) {
            const currentPageSize = (pageNumber === 1) ? FLYER_PAGE_SIZE : ADDITIONAL_PAGE_SIZE;
            const pageDiv = document.createElement('div'); pageDiv.className = 'product-page'; pageDiv.dataset.pageNumber = pageNumber; pageDiv.style.display = 'none';
            const gridContainer = document.createElement('div'); gridContainer.className = 'submission-products-grid-container';
            const productsForPage = products.slice(productIndex, productIndex + currentPageSize);
            if (productsForPage.length === 0 && productIndex < products.length) { break; }
            productsForPage.forEach((product) => {
                const formatAsPrice = (p) => (typeof p === 'number' ? `$${p.toFixed(2)}` : 'N/A');
                let priceDetail;
                if (product.regularPrice === 0 && product.salePrice === 0 && product.manualDiscountDescription) { priceDetail = `<strong>Discount:</strong> ${escapeHtml(product.manualDiscountDescription)}`; }
                else { priceDetail = `<strong>Price:</strong> Reg ${formatAsPrice(product.regularPrice)} / Sale ${formatAsPrice(product.salePrice)} (${escapeHtml(product.discountPercent || 'N/A')})`; }
                const productCard = document.createElement('div'); productCard.className = 'submission-product-card';
                let imageHtml = '<div class="submission-product-card-no-image">(No Image Provided)</div>';
                if (product.imageDataUrl) {
                    const href = escapeHtml(product.imageDataUrl);
                    const title = `${escapeHtml(product.productName || 'Product')} (${escapeHtml(product.brandName || 'N/A')})`;
                    const galleryName = `submission-${submissionId}`;
                    imageHtml = `<a href="${href}" class="glightbox" data-gallery="${galleryName}" data-type="image" title="${title}"><img src="${href}" alt="Image of ${escapeHtml(product.productName)}" class="submission-product-card-image"></a>`;
                } else if (product.requestStockImage && product.imageFileName) { imageHtml = `<div class="submission-product-card-ref-image">Requested Stock Image: ${escapeHtml(product.imageFileName)}</div>`; }
                else if (product.requestStockImage) { imageHtml = `<div class="submission-product-card-ref-image">Stock Image Requested</div>`; }
                productCard.innerHTML = `<h4 class="product-card-title">${escapeHtml(product.productName || 'Unnamed Product')} (${escapeHtml(product.brandName || 'N/A')})</h4>${imageHtml}<div class="product-card-details"><p><strong>Category:</strong> ${escapeHtml(product.category || 'N/A')}</p><p>${priceDetail}</p>${product.sku ? `<p><strong>SKU:</strong> ${escapeHtml(product.sku)}</p>` : ''}${product.sizeDimensions ? `<p><strong>Size/Dimensions:</strong> ${escapeHtml(product.sizeDimensions)}</p>` : ''}${product.colourFinish ? `<p><strong>Colour/Finish:</strong> ${escapeHtml(product.colourFinish)}</p>` : ''}${product.isBundle && product.bundleItems ? `<p><strong>Bundle Items:</strong> ${escapeHtml(product.bundleItems)}</p>` : ''}<p class="submission-product-card-flags">${product.includeInSocial ? '<span class="product-tag social-flag">Social</span>' : ''}${product.isMainFlyerProduct ? '<span class="product-tag main-flyer-tag">Main</span>' : ''}${product.isBundle ? '<span class="product-tag bundle-tag">Bundle</span>' : ''}${product.requestStockImage ? '<span class="product-tag stock-image-tag">Req. Stock Img</span>' : ''}${product.imageFileName && !product.imageDataUrl && !product.requestStockImage ? `<span class="product-tag ref-image-tag">Ref Img: ${escapeHtml(product.imageFileName)}</span>` : ''}</p></div>`;
                gridContainer.appendChild(productCard);
            });
            pageDiv.appendChild(gridContainer); productPagesHost.appendChild(pageDiv); productIndex += currentPageSize; pageNumber++;
        }
        const paginationControls = document.createElement('div'); paginationControls.className = 'pagination-controls'; paginationControls.innerHTML = `<button type="button" class="button button-secondary" id="modal-product-prev" style="display: none;">&laquo; Previous</button><span id="modal-product-page-indicator" style="margin: 0 15px; font-weight: 500; display: none;"></span><button type="button" class="button button-secondary" id="modal-product-next" style="display: none;">Next &raquo;</button>`;
        productsOuterContainer.appendChild(productPagesHost); productsOuterContainer.appendChild(paginationControls);
        const pageIndicator = paginationControls.querySelector('#modal-product-page-indicator'); const prevButton = paginationControls.querySelector('#modal-product-prev'); const nextButton = paginationControls.querySelector('#modal-product-next');
        setupProductPagination(productPagesHost, pageIndicator, prevButton, nextButton);
    } else { productsOuterContainer.innerHTML += '<p style="text-align:center; padding:20px 0;">No products were included in this submission.</p>'; }
    column2.appendChild(productsOuterContainer);
    submissionDetailContent.appendChild(column2);
    const column3 = document.createElement('div');
    column3.className = 'modal-column modal-column-auxiliary';
    let col3Html = `<h3>Social Media Items</h3>`;
    const socialProducts = products.filter(p => p.includeInSocial);
    if (socialProducts.length > 0) { col3Html += '<ul class="details-list social-details-list">'; socialProducts.forEach(product => { col3Html += `<li>${escapeHtml(product.productName)} (${escapeHtml(product.brandName || 'N/A')})</li>`; }); col3Html += '</ul>'; }
    else { col3Html += '<p>No products were specifically flagged for social media outreach.</p>'; }
    col3Html += '<hr><h3>Print Requests</h3>'; const pr = formData.printRequests || {};
    col3Html += `<ul class="details-list print-requests-list"><li><strong>Price Tags Requested:</strong> ${pr.priceTags ? 'Yes' : 'No'}</li><li><strong>Posters Requested:</strong> ${pr.posters ? 'Yes' : 'No'}</li><li><strong>In-Store Signage Requested:</strong> ${pr.inStoreSignage ? 'Yes' : 'No'}</li></ul><h4>Print Notes:</h4><pre class="notes-content">${escapeHtml(pr.notes) || 'No specific notes for print materials.'}</pre>`;
    column3.innerHTML = col3Html;
    submissionDetailContent.appendChild(column3);
    console.log('MODAL: Initializing GLightbox');
    try {
        if (typeof GLightbox === 'undefined') {
            console.error('GLightbox library is not loaded!');
            submissionDetailContent.insertAdjacentHTML('beforeend', '<p class="error-message" style="text-align:center; margin-top:15px;">Image gallery library not loaded.</p>');
            return;
        }
        if (currentGlightboxInstance && typeof currentGlightboxInstance.destroy === 'function') {
             currentGlightboxInstance.destroy();
        }
        currentGlightboxInstance = GLightbox({
            selector: '.glightbox',
            loop: true,
            touchNavigation: true,
            keyboardNavigation: true,
            zoomable: true, 
            draggable: true
         });
        currentGlightboxInstance.on('open', () => { console.log('GLightbox opened'); });
        currentGlightboxInstance.on('close', () => {
            console.log('GLightbox closed.');
            currentGlightboxInstance = null;
        });
        console.log('MODAL: GLightbox initialized successfully.');
    } catch (e) { console.error('MODAL: Error initializing GLightbox:', e); submissionDetailContent.insertAdjacentHTML('beforeend', '<p class="error-message" style="text-align:center; margin-top:15px;">Image gallery could not be loaded.</p>'); }
    console.log('--- MODAL: showSubmissionDetailModal END (Horizontal Layout) ---');
}

function closeSubmissionDetailModal() {
    if (submissionDetailModal) {
        submissionDetailModal.classList.remove('visible');
        if (submissionDetailContent) submissionDetailContent.innerHTML = '<p>Loading details...</p>';
    }
    if (currentGlightboxInstance && typeof currentGlightboxInstance.close === 'function') {
        currentGlightboxInstance.close();
    }
    console.log('Submission detail modal closed.');
}

// --- Admin Functions ---
async function fetchAndDisplaySingleSubmission(submissionId) { if (!submissionId) return; console.log(`Workspaceing details for ID: ${submissionId}`); if (submissionDetailModal && submissionDetailContent) { submissionDetailContent.innerHTML = '<p>Loading details...</p>'; submissionDetailModal.classList.add('visible'); } else { alert("Loading..."); } const token = sessionStorage.getItem('adminToken'); if (!token) { if(submissionDetailContent) submissionDetailContent.innerHTML = '<p class="error-message">Not logged in.</p>'; return; } try { const response = await fetch(`/api/admin/submission/${submissionId}`, { method: 'GET', headers: { 'Authorization': `Bearer ${token}` } }); if (response.ok) { const submissionData = await response.json(); showSubmissionDetailModal(submissionData); } else if (response.status === 404) { if(submissionDetailContent) submissionDetailContent.innerHTML = `<p class="error-message">Error: Submission ${submissionId} not found.</p>`; } else if (response.status === 401 || response.status === 403) { sessionStorage.removeItem('adminToken'); if(submissionDetailContent) submissionDetailContent.innerHTML = '<p class="error-message">Session expired.</p>'; setTimeout(closeSubmissionDetailModal, 1500); handleAdminLogout(); } else { const errorResult = await response.text(); if(submissionDetailContent) submissionDetailContent.innerHTML = `<p class="error-message">Error: ${response.statusText}</p>`; } } catch (error) { console.error('Network error fetching detail:', error); if(submissionDetailContent) submissionDetailContent.innerHTML = '<p class="error-message">Network error.</p>'; } }
function showForceSaveModal() { if (forceSaveModal) forceSaveModal.classList.add('visible'); else alert("Please save changes in the active section before proceeding."); }
function hideForceSaveModal() { if (forceSaveModal) forceSaveModal.classList.remove('visible'); }
async function handleAdminLogin(event) {
    event.preventDefault();
    if (!adminUsername || !adminPassword || !adminLoginError || !adminLogin || !adminDashboard) return;
    const username = adminUsername.value;
    const password = adminPassword.value;
    adminLoginError.textContent = '';
    adminLoginError.style.display = 'none';
    if (!username || !password) {
        adminLoginError.textContent = 'Username/password required.';
        adminLoginError.style.display = 'block';
        return;
    }
    try {
        const response = await fetch('/api/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', },
            body: JSON.stringify({ username, password }),
        });
        const result = await response.json();
        if (response.ok) {
            sessionStorage.setItem('adminToken', result.token);
            adminLogin.style.display = 'none';
            adminDashboard.style.display = 'block';
            const adminName = adminUsername.value || "Admin";
            if (adminGreetingElement) {
                adminGreetingElement.textContent = `What's a beautiful day, ${escapeHtml(adminName)}, eh?`;
            }
            adminPassword.value = '';
            loadAdminSubmissions();
        } else {
            adminLoginError.textContent = result.message || 'Login failed.';
            adminLoginError.style.display = 'block';
            adminPassword.value = '';
        }
    } catch (error) {
        console.error('Login network err:', error);
        adminLoginError.textContent = 'Network error.';
        adminLoginError.style.display = 'block';
        adminPassword.value = '';
    }
}
function handleAdminLogout() {
    sessionStorage.removeItem('adminToken');
    if (!adminDashboard || !adminLogin || !adminSection || !showAdminLoginBtn || !flyerForm) return;
    adminDashboard.style.display = 'none';
    adminSection.style.display = 'none';
    adminLogin.style.display = 'block';
    flyerForm.style.display = 'block';
    showAdminLoginBtn.style.display = 'inline-block';
    if(adminUsername) adminUsername.value = '';
    if(adminPassword) adminPassword.value = '';
    if (adminGreetingElement) {
        adminGreetingElement.textContent = '';
    }
    if (clearFiltersBtn) clearFiltersBtn.click(); 
    if (adminSubmissionsList) adminSubmissionsList.innerHTML = '';
    selectedSubmissionIds.clear(); 
    updateDeleteButtonState();    
    console.log("Admin logged out.");
}

// --- MODIFIED: loadAdminSubmissions to send filter parameters ---
async function loadAdminSubmissions() {
    if (!adminSubmissionsList) return;
    const token = sessionStorage.getItem('adminToken');
    if (!token) {
        adminSubmissionsList.innerHTML = '<p class="error-message">Not logged in.</p>';
        return;
    }
    adminSubmissionsList.innerHTML = '<p>Loading...</p>';

    // Build query parameters for filtering
    const params = new URLSearchParams();
    if (filterDateStartInput && filterDateStartInput.value) {
        params.append('dateStart', filterDateStartInput.value);
    }
    if (filterDateEndInput && filterDateEndInput.value) {
        params.append('dateEnd', filterDateEndInput.value);
    }
    if (filterStoreNameInput && filterStoreNameInput.value.trim()) {
        params.append('storeName', filterStoreNameInput.value.trim());
    }
    const queryString = params.toString();
    const fetchUrl = `/api/admin/submissions${queryString ? '?' + queryString : ''}`;

    try {
        const response = await fetch(fetchUrl, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            const submissions = await response.json();
            // No need for allAdminSubmissions if server does the filtering
            displaySubmissions(submissions); 
        } else if (response.status === 401 || response.status === 403) {
            sessionStorage.removeItem('adminToken');
            adminSubmissionsList.innerHTML = '<p class="error-message">Session expired.</p>';
            handleAdminLogout();
        } else {
            const errorText = await response.text(); // Get more detail on error
            adminSubmissionsList.innerHTML = `<p class="error-message">Error: ${response.statusText} - ${errorText}</p>`;
        }
    } catch (error) {
        console.error('Network error fetching submissions:', error);
        adminSubmissionsList.innerHTML = '<p class="error-message">Network error.</p>';
    }
}

// Client-side filtering function REMOVED as server will handle filtering
// function renderFilteredSubmissions() { ... } 

// --- MODIFIED: displaySubmissions function ---
function displaySubmissions(submissionsToDisplay) {
    if (!adminSubmissionsList) return;
    adminSubmissionsList.innerHTML = '';
    selectedSubmissionIds.clear(); 
    updateDeleteButtonState();    

    if (!submissionsToDisplay || submissionsToDisplay.length === 0) {
        adminSubmissionsList.innerHTML = '<p>No submissions found matching your criteria.</p>';
        return;
    }

    const table = document.createElement('table');
    table.className = 'submissions-table';
    const thead = table.createTHead();
    const headerRow = thead.insertRow();
    
    const thSelect = document.createElement('th');
    const selectAllCheckbox = document.createElement('input');
    selectAllCheckbox.type = 'checkbox';
    selectAllCheckbox.title = 'Select/Deselect All';
    selectAllCheckbox.addEventListener('change', (event) => {
        const isChecked = event.target.checked;
        adminSubmissionsList.querySelectorAll('.submission-select-checkbox').forEach(checkbox => {
            checkbox.checked = isChecked;
            const subId = checkbox.dataset.submissionId;
            if (isChecked && subId) { // Ensure subId is not undefined
                selectedSubmissionIds.add(subId);
            } else if (subId) {
                selectedSubmissionIds.delete(subId);
            }
        });
        updateDeleteButtonState();
    });
    thSelect.appendChild(selectAllCheckbox);
    headerRow.appendChild(thSelect);

    const headers = ['ID', 'Submitted At', 'Flyer Start', 'Store', 'Submitter', 'Product Count', 'Details'];
    headers.forEach(text => {
        const th = document.createElement('th');
        th.textContent = text;
        headerRow.appendChild(th);
    });

    const tbody = table.createTBody();
    submissionsToDisplay.forEach(submission => {
        const row = tbody.insertRow();
        row.setAttribute('data-submission-id', String(submission.id)); // Ensure ID is string for dataset

        const cellSelect = row.insertCell();
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'submission-select-checkbox';
        checkbox.dataset.submissionId = String(submission.id); // Ensure ID is string
        checkbox.checked = selectedSubmissionIds.has(String(submission.id)); 
        checkbox.addEventListener('change', (event) => {
            const subId = String(submission.id);
            if (event.target.checked) {
                selectedSubmissionIds.add(subId);
            } else {
                selectedSubmissionIds.delete(subId);
            }
            updateDeleteButtonState();
        });
        cellSelect.appendChild(checkbox);

        row.insertCell().textContent = submission.id || 'N/A';
        row.insertCell().textContent = submission.submitted_at ? formatDateTime(submission.submitted_at) : 'N/A';
        row.insertCell().textContent = submission.flyer_start_date ? formatDate(submission.flyer_start_date) : 'N/A';
        row.insertCell().textContent = submission.store_name || 'N/A';
        row.insertCell().textContent = submission.submitted_by || 'N/A';
        const cellProducts = row.insertCell();
        cellProducts.textContent = (typeof submission.product_count === 'number') ? `${submission.product_count}` : 'N/A';
        cellProducts.style.textAlign = 'center';
        const cellDetails = row.insertCell();
        const viewDetailsLink = document.createElement('a');
        viewDetailsLink.href = '#';
        viewDetailsLink.innerHTML = '<small>View Details</small>';
        viewDetailsLink.style.textDecoration = 'underline';
        viewDetailsLink.addEventListener('click', (e) => {
            e.preventDefault();
            fetchAndDisplaySingleSubmission(submission.id);
        });
        cellDetails.appendChild(viewDetailsLink);
    });
    adminSubmissionsList.appendChild(table);
}

function checkLoginState() {
    const token = sessionStorage.getItem('adminToken');
    if (token) {
        if (adminSection && adminLogin && adminDashboard && flyerForm && showAdminLoginBtn) {
            adminSection.style.display = 'block';
            adminLogin.style.display = 'none';
            adminDashboard.style.display = 'block';
            flyerForm.style.display = 'none';
            showAdminLoginBtn.style.display = 'none';
            const adminName = adminUsername?.value || sessionStorage.getItem('adminUsername') || "Admin"; 
             if (adminGreetingElement) {
                adminGreetingElement.textContent = `What's a beautiful day, ${escapeHtml(adminName)}, eh?`;
            }
            loadAdminSubmissions();
        }
    } else {
        if (adminSection) adminSection.style.display = 'none';
        if (flyerForm) flyerForm.style.display = 'block';
        if (showAdminLoginBtn) showAdminLoginBtn.style.display = 'inline-block';
    }
}
function initializeFlyerCountdown() {
    if (countdownInterval) clearInterval(countdownInterval);
    const submissionStartDate = new Date();
    if (submissionDateElement) submissionDateElement.textContent = formatDateTime(submissionStartDate);
    if (lastUpdatedElement) lastUpdatedElement.textContent = formatDateTime(submissionStartDate);
    const deadlineDate = new Date(submissionStartDate.getTime());
    deadlineDate.setDate(submissionStartDate.getDate() + 14); 
    if (deadlineDateDisplayEl) {
        deadlineDateDisplayEl.textContent = deadlineDate.toLocaleDateString('en-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) + " at " + deadlineDate.toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' });
    }
    function updateCountdownDisplay() {
        if (!countdownTimerDisplayEl) return;
        const now = new Date();
        const timeLeft = deadlineDate.getTime() - now.getTime();
        if (timeLeft <= 0) {
            countdownTimerDisplayEl.innerHTML = "<span class='expired'>Estimated deadline passed.</span>";
            clearInterval(countdownInterval);
            return;
        }
        const d = Math.floor(timeLeft / 86400000);
        const h = Math.floor((timeLeft % 86400000) / 3600000);
        const m = Math.floor((timeLeft % 3600000) / 60000);
        const s = Math.floor((timeLeft % 60000) / 1000);
        countdownTimerDisplayEl.innerHTML = `<span>${String(d).padStart(2,'0')}d</span><span>${String(h).padStart(2,'0')}h</span><span>${String(m).padStart(2,'0')}m</span><span>${String(s).padStart(2,'0')}s</span>`;
    }
    if (countdownTimerDisplayEl) {
        updateCountdownDisplay();
        countdownInterval = setInterval(updateCountdownDisplay, 1000);
    }
}
function updateFormDisabledState() {
    const disable = activeEditingSectionElement !== null && isCurrentSectionDirty;
    const elementsToToggle = [ storeDetailsSection, flyerOptionsContainer, socialMediaSection, printRequestSection, addNewPageBtn, submitContainer, ...document.querySelectorAll('.page-section, .flyer-products-section') ].filter(el => el);
    elementsToToggle.forEach(el => {
        if (!el) return;
        const isButton = el.tagName === 'BUTTON';
        const isTheActiveSection = el === activeEditingSectionElement;
        const isOutsideActive = !isTheActiveSection && !activeEditingSectionElement?.contains(el);
        if (disable && isOutsideActive) {
            el.classList.add('form-section-disabled');
            if (isButton) el.disabled = true;
        } else {
            el.classList.remove('form-section-disabled');
            if (isButton) el.disabled = false;
        }
    });
    document.querySelectorAll('.page-section, .flyer-products-section').forEach(section => {
        const isTheActiveSection = section === activeEditingSectionElement;
        const isActiveAndDirty = isTheActiveSection && isCurrentSectionDirty;
        const isActiveAndEditing = isTheActiveSection && section.dataset.editing === 'true';
        const reminderNote = section.querySelector('.save-reminder-note');
        if (reminderNote) {
            reminderNote.style.display = isActiveAndDirty ? 'block' : 'none';
        }
        section.querySelectorAll('.add-product-in-cell-btn').forEach(btn => {
            btn.style.display = isActiveAndEditing ? 'inline-block' : 'none';
        });
         section.querySelectorAll('.product-item-actions .edit-product-btn, .product-item-actions .remove-item-btn').forEach(btn => {
             btn.style.display = isActiveAndEditing ? 'inline-block' : 'none';
         });
    });
    if (activeEditingSectionElement) {
        activeEditingSectionElement.classList.remove('form-section-disabled');
        activeEditingSectionElement.querySelectorAll('.page-actions button').forEach(btn => {
            btn.disabled = false;
            btn.classList.remove('form-section-disabled');
        });
    }
    if (addNewPageBtn) {
        addNewPageBtn.disabled = (currentAdditionalPagesCount >= MAX_ADDITIONAL_PAGES) || (disable && addNewPageBtn !== activeEditingSectionElement && !activeEditingSectionElement?.contains(addNewPageBtn));
         if (addNewPageBtn.disabled && disable) {
             addNewPageBtn.classList.add('form-section-disabled');
         } else {
              addNewPageBtn.classList.remove('form-section-disabled');
         }
    }
     if (submitContainer) {
         const submitBtn = submitContainer.querySelector('#submitBtn');
         if (disable) {
             submitContainer.classList.add('form-section-disabled');
             if(submitBtn) submitBtn.disabled = true;
         } else {
             submitContainer.classList.remove('form-section-disabled');
              if(submitBtn) submitBtn.disabled = false;
         }
     }
}

// --- Admin Dashboard Helper Functions ---
function updateDeleteButtonState() {
    if (deleteSelectedSubmissionsBtn && selectedSubmissionsCountElement) {
        if (selectedSubmissionIds.size > 0) {
            deleteSelectedSubmissionsBtn.style.display = 'inline-block';
            selectedSubmissionsCountElement.textContent = String(selectedSubmissionIds.size);
        } else {
            deleteSelectedSubmissionsBtn.style.display = 'none';
        }
    }
}
async function handleDeleteSelectedSubmissions() {
    if (selectedSubmissionIds.size === 0) {
        alert("Please select at least one submission to delete.");
        return;
    }
    const count = selectedSubmissionIds.size;
    if (window.confirm(`Are you sure you want to delete ${count} selected submission(s)? This action cannot be undone.`)) {
        console.log("Attempting to delete submission IDs:", Array.from(selectedSubmissionIds));
        const token = sessionStorage.getItem('adminToken');
        if (!token) {
            alert("Admin session expired. Please log in again.");
            handleAdminLogout();
            return;
        }
        // Use Promise.all to handle multiple delete requests concurrently
        const deletePromises = Array.from(selectedSubmissionIds).map(id => {
            return fetch(`/api/admin/submission/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            }).then(response => {
                if (!response.ok) {
                    // Log error but don't stop other deletions for now
                    console.error(`Error deleting submission ${id}: ${response.status} ${response.statusText}`);
                    // Potentially collect failed IDs to notify user
                    return { id, success: false, status: response.status };
                }
                console.log(`Submission ${id} marked for deletion.`);
                return { id, success: true };
            }).catch(error => {
                console.error(`Network error deleting submission ${id}:`, error);
                return { id, success: false, error };
            });
        });

        try {
            const results = await Promise.all(deletePromises);
            const successfulDeletes = results.filter(r => r.success).length;
            const failedDeletes = results.filter(r => !r.success).length;

            if (successfulDeletes > 0) {
                showSuccessModal(`${successfulDeletes} submission(s) deleted successfully.`);
            }
            if (failedDeletes > 0) {
                // More robust error reporting could list IDs that failed
                alert(`${failedDeletes} submission(s) could not be deleted. Check console for details.`);
            }
        } catch (error) {
            // This catch is for if Promise.all itself fails, which is unlikely with individual catches
            console.error("Error in batch deletion process:", error);
            alert("An unexpected error occurred during the deletion process.");
        }
        
        selectedSubmissionIds.clear(); 
        loadAdminSubmissions(); 
    }
}

// --- Initialization ---
function initializeForm() {
    console.log("Initializing form...");
    storeNameInput=document.getElementById('storeNameInput');submittedByInput=document.getElementById('submittedByInput');submissionDateElement=document.getElementById('submissionDate');lastUpdatedElement=document.getElementById('lastUpdated');startDateInput=document.getElementById('flyerValidStartDate');endDateInput=document.getElementById('flyerValidEndDate');generalNotesTextarea=document.getElementById('generalNotes');productEditArea=document.getElementById('productEditArea');productFormFieldsContainer=document.getElementById('productFormFieldsContainer'); flyerProductsGrid=document.getElementById('flyerProductsGrid');saveProductBtn=document.getElementById('saveProductBtn');cancelProductBtn=document.getElementById('cancelProductBtn');productFormFieldsTemplate=document.getElementById('productFormFieldsTemplate');productDisplayTemplate=document.getElementById('productDisplayTemplate');productSubmitErrorElement=document.getElementById('productSubmitError');productEditErrorElement=document.getElementById('productEditError'); socialItemsListDiv=document.getElementById('socialItemsList'); socialMediaSection=document.getElementById('socialMediaSection'); socialCounterDisplay=document.getElementById('socialCounterDisplay'); reqPriceTagsCheckbox=document.getElementById('reqPriceTags');reqPostersCheckbox=document.getElementById('reqPosters');reqSignageCheckbox=document.getElementById('reqSignage');printNotesTextarea=document.getElementById('printNotes');flyerForm=document.getElementById('flyerForm');formErrorElement=document.getElementById('formError');successModal=document.getElementById('successModal');modalMessage=document.getElementById('modalMessage');modalCloseBtn=document.getElementById('modalCloseBtn'); showAdminLoginBtn=document.getElementById('showAdminLoginBtn');adminSection=document.getElementById('adminSection');adminLogin=document.getElementById('adminLogin');adminLoginForm=document.getElementById('adminLoginForm');adminUsername=document.getElementById('adminUsername');adminPassword=document.getElementById('adminPassword');adminLoginError=document.getElementById('adminLoginError');adminDashboard=document.getElementById('adminDashboard');adminLogoutBtn=document.getElementById('adminLogoutBtn');adminSubmissionsList=document.getElementById('adminSubmissionsList'); submissionDetailModal=document.getElementById('submissionDetailModal');submissionDetailContent=document.getElementById('submissionDetailContent');submissionDetailCloseBtn=document.getElementById('submissionDetailCloseBtn'); flyerProductCounterDisplay=document.getElementById('flyerProductCounter');addNewPageBtn=document.getElementById('addNewPageBtn');additionalPagesContainer=document.getElementById('additionalPagesContainer');newPageSectionTemplate=document.getElementById('newPageSectionTemplate'); productEditModal=document.getElementById('productEditModal'); productEditCloseBtn=document.getElementById('productEditCloseBtn'); editSaveFlyerBtn=document.getElementById('editSaveFlyerBtn'); deadlineDateDisplayEl = document.getElementById('flyer-deadline-date-display'); countdownTimerDisplayEl = document.getElementById('countdown-timer-display'); storeDetailsSection = document.querySelector('#flyerForm > section:first-of-type'); flyerOptionsContainer = document.querySelector('.flyer-options-container'); printRequestSection = reqPriceTagsCheckbox?.closest('.form-section'); submitContainer = document.querySelector('.submit-container'); flyerProductsSection = document.querySelector('.flyer-products-section'); forceSaveModal = document.getElementById('forceSaveModal'); forceSaveBtn = document.getElementById('forceSaveBtn'); forceSaveCancelBtn = document.getElementById('forceSaveCancelBtn'); forceSaveCloseBtn = forceSaveModal?.querySelector('.force-save-close-btn');
    extractPdfBtn = document.getElementById('extractPdfBtn');
    adminGreetingElement = document.getElementById('adminGreeting');
    deleteSelectedSubmissionsBtn = document.getElementById('deleteSelectedSubmissionsBtn');
    selectedSubmissionsCountElement = document.getElementById('selectedSubmissionsCount');
    filterDateStartInput = document.getElementById('filterDateStart');
    filterDateEndInput = document.getElementById('filterDateEnd');
    filterStoreNameInput = document.getElementById('filterStoreName');
    applyFiltersBtn = document.getElementById('applyFiltersBtn');
    clearFiltersBtn = document.getElementById('clearFiltersBtn');
    const essentialElements=[flyerForm, socialItemsListDiv, socialCounterDisplay, successModal,modalCloseBtn,productEditArea,productFormFieldsContainer,saveProductBtn,cancelProductBtn,productFormFieldsTemplate,productDisplayTemplate, showAdminLoginBtn,adminSection,adminLogin,adminLoginForm,adminDashboard,adminLogoutBtn,adminSubmissionsList,submissionDetailModal,submissionDetailContent,submissionDetailCloseBtn,flyerProductsGrid,flyerProductCounterDisplay,addNewPageBtn,additionalPagesContainer,newPageSectionTemplate,productEditModal,productEditCloseBtn,editSaveFlyerBtn, deadlineDateDisplayEl, countdownTimerDisplayEl, storeDetailsSection, flyerOptionsContainer, printRequestSection, submitContainer, flyerProductsSection, forceSaveModal, forceSaveBtn, forceSaveCancelBtn, adminGreetingElement, deleteSelectedSubmissionsBtn, selectedSubmissionsCountElement, filterDateStartInput, filterDateEndInput, filterStoreNameInput, applyFiltersBtn, clearFiltersBtn ];
    const missingElements = essentialElements.filter(el => !el);
    if(missingElements.length > 0) {
        console.error("Essential DOM elements are missing! Application may not function correctly. Missing elements refs (approx):", missingElements.map(el => el?.id || el?.tagName || 'Unknown'));
    }
     if (!extractPdfBtn) {
        console.warn("PDF Extract button (extractPdfBtn) not found. PDF generation feature will be unavailable.");
    }
    if(flyerForm) flyerForm.addEventListener('submit', handleSubmit);
    if(modalCloseBtn) modalCloseBtn.addEventListener('click', closeSuccessModal);
    if(successModal) successModal.addEventListener('click',(event)=>{if(event.target===successModal)closeSuccessModal();});
    if(submissionDetailCloseBtn) submissionDetailCloseBtn.addEventListener('click', closeSubmissionDetailModal);
    if(submissionDetailModal) submissionDetailModal.addEventListener('click',(event)=>{ if(event.target===submissionDetailModal && currentGlightboxInstance && typeof currentGlightboxInstance.close === 'function') { } else if(event.target===submissionDetailModal) { closeSubmissionDetailModal();} });
    if(productEditCloseBtn) productEditCloseBtn.addEventListener('click', hideProductForm);
    if(productEditModal) productEditModal.addEventListener('click', (event) => { if (event.target === productEditModal) hideProductForm(); });
    if(showAdminLoginBtn) showAdminLoginBtn.addEventListener('click',()=>{ if(flyerForm) flyerForm.style.display='none'; if(adminSection) adminSection.style.display='block'; if(adminLogin) adminLogin.style.display='block'; if(adminDashboard) adminDashboard.style.display='none'; if(adminUsername)adminUsername.focus(); showAdminLoginBtn.style.display='none';});
    if(adminLoginForm) adminLoginForm.addEventListener('submit',handleAdminLogin);
    if(adminLogoutBtn) adminLogoutBtn.addEventListener('click',handleAdminLogout);
    if(editSaveFlyerBtn) editSaveFlyerBtn.addEventListener('click', togglePageEditMode);
    if (extractPdfBtn) {
        extractPdfBtn.addEventListener('click', generateSubmissionPdf);
    }
    if (addNewPageBtn) { addNewPageBtn.addEventListener('click', () => { if (activeEditingSectionElement && isCurrentSectionDirty) { showForceSaveModal(); return; } if (currentAdditionalPagesCount >= MAX_ADDITIONAL_PAGES) { alert(`Maximum of ${MAX_ADDITIONAL_PAGES} additional pages reached.`); return; } if (activeEditingSectionElement && activeEditingSectionElement.dataset.editing === 'true') { const prevSaveBtn = activeEditingSectionElement.querySelector('.edit-save-page-btn'); if (prevSaveBtn && prevSaveBtn.dataset.mode === 'save') { prevSaveBtn.textContent = 'Edit Page'; prevSaveBtn.dataset.mode = 'edit'; prevSaveBtn.classList.remove('button-primary'); prevSaveBtn.classList.add('button-secondary'); } activeEditingSectionElement.dataset.editing = 'false'; const prevNote = activeEditingSectionElement.querySelector('.save-reminder-note'); if(prevNote) prevNote.style.display = 'none'; activeEditingSectionElement.querySelectorAll('.add-product-in-cell-btn, .product-item-actions .edit-product-btn, .product-item-actions .remove-item-btn').forEach(btn => btn.style.display = 'none'); } const existingPagesCount = additionalPagesContainer.querySelectorAll('.page-section').length; const newPageNumber = existingPagesCount + 2; currentAdditionalPagesCount++; const newPageClone = newPageSectionTemplate.content.cloneNode(true); const newPageSection = newPageClone.querySelector('.page-section'); newPageSection.querySelector('.page-title').textContent = `Additional Products (Page ${newPageNumber} - Max ${MAX_NEW_PAGE_PRODUCTS} Slots)`; const newGrid = newPageSection.querySelector('.new-page-grid'); const newCounterDisplay = newPageSection.querySelector('.page-product-counter'); const removePageBtn = newPageSection.querySelector('.remove-page-btn'); const editSaveNewPageBtn = newPageSection.querySelector('.edit-save-page-btn'); if(removePageBtn) removePageBtn.addEventListener('click', handleRemovePage); if(editSaveNewPageBtn) editSaveNewPageBtn.addEventListener('click', togglePageEditMode); initializeNewPageGrid(newGrid, newCounterDisplay, MAX_NEW_PAGE_PRODUCTS); additionalPagesContainer.appendChild(newPageSection); activeEditingSectionElement = newPageSection; isCurrentSectionDirty = false; newPageSection.dataset.dirty = 'false'; if (currentAdditionalPagesCount >= MAX_ADDITIONAL_PAGES) { addNewPageBtn.disabled = true; } updateFormDisabledState(); newPageSection.scrollIntoView({ behavior: 'smooth', block: 'start' }); }); }
    document.body.addEventListener('click', function(event) { if (activeEditingSectionElement && isCurrentSectionDirty) { const isInsideActive = activeEditingSectionElement.contains(event.target); const isInsideModal = event.target.closest('.modal-overlay, .product-edit-modal-box'); const isInsideGlightbox = event.target.closest('.glightbox-container'); if (!isInsideActive && !isInsideModal && !isInsideGlightbox && flyerForm?.contains(event.target)) { console.log("Click outside active dirty section detected. Showing force save modal."); event.preventDefault(); event.stopPropagation(); showForceSaveModal(); } } }, true);
    if (forceSaveBtn) { forceSaveBtn.addEventListener('click', () => { if (activeEditingSectionElement) { activeEditingSectionElement.querySelector('.edit-save-page-btn[data-mode="save"]')?.click(); } hideForceSaveModal(); }); }
    if (forceSaveCancelBtn) forceSaveCancelBtn.addEventListener('click', hideForceSaveModal);
    if (forceSaveCloseBtn) forceSaveCloseBtn.addEventListener('click', hideForceSaveModal);
    if (forceSaveModal) forceSaveModal.addEventListener('click', (event) => { if (event.target === forceSaveModal) hideForceSaveModal(); });
    if (deleteSelectedSubmissionsBtn) {
        deleteSelectedSubmissionsBtn.addEventListener('click', handleDeleteSelectedSubmissions);
    }
    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', loadAdminSubmissions); // Now calls loadAdminSubmissions directly
    }
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', () => {
            if(filterDateStartInput) filterDateStartInput.value = '';
            if(filterDateEndInput) filterDateEndInput.value = '';
            if(filterStoreNameInput) filterStoreNameInput.value = '';
            loadAdminSubmissions(); // Reload with cleared filters
        });
    }
    initializeFlyerGrid(); renderSocialMediaList(); initializeFlyerCountdown(); checkLoginState(); if (flyerProductsSection?.dataset.editing === 'true') { activeEditingSectionElement = flyerProductsSection; } else { activeEditingSectionElement = null; } isCurrentSectionDirty = false; if(activeEditingSectionElement) activeEditingSectionElement.dataset.dirty = 'false';
    updateFormDisabledState();
    console.log("Form Initialized successfully.");
}
// --- Form Submission Handler ---
async function handleSubmit(event) {
    event.preventDefault();
    if (!flyerForm || !flyerProductsGrid) return;
    if (activeEditingSectionElement && isCurrentSectionDirty) {
        showForceSaveModal(); return;
    }
    console.log("Form submission initiated...");
    if(formErrorElement) { formErrorElement.textContent = ''; formErrorElement.style.display = 'none'; }
    if(productSubmitErrorElement) { productSubmitErrorElement.style.display = 'none'; }
    flyerForm.querySelectorAll('.invalid').forEach(el => el.classList.remove('invalid'));
    let isFormValid = true;
    let firstInvalidElement = null;
    const validationErrors = [];
    const mainFormInputs = flyerForm.querySelectorAll('#storeNameInput, #submittedByInput, #flyerValidStartDate, #flyerValidEndDate');
    mainFormInputs.forEach(input => {
        if (!input.checkValidity()) {
            isFormValid = false;
            input.classList.add('invalid');
            if (!firstInvalidElement) firstInvalidElement = input;
            const label = flyerForm?.querySelector(`label[for="${input.id}"]`)?.textContent || input.name || input.id;
            validationErrors.push(`${label.replace(':*', '').trim()} is required.`);
        }
    });
    if (startDateInput?.value && endDateInput?.value && endDateInput.value < startDateInput.value) {
        isFormValid = false;
        endDateInput.classList.add('invalid');
        if(!firstInvalidElement) firstInvalidElement = endDateInput;
        validationErrors.push("End Date cannot be before Start Date.");
    }
    const products = [];
    const allProductGrids = [flyerProductsGrid, ...additionalPagesContainer.querySelectorAll('.products-grid-container.new-page-grid')];
    let productGatherError = false;
    allProductGrids.forEach(grid => {
        grid.querySelectorAll('.product-item[data-product-id]').forEach(item => {
            const id = item.getAttribute('data-product-id');
            const productData = getProductDataById(id);
            if(productData) products.push(productData);
            else { console.error(`Data missing for product ID: ${id}`); productGatherError = true; }
        });
    });
    if (products.length === 0) {
        isFormValid = false;
        if(productSubmitErrorElement) {productSubmitErrorElement.textContent = "At least one product is required for the submission."; productSubmitErrorElement.style.display = 'block';}
        validationErrors.push("At least one product required.");
        if(!firstInvalidElement) firstInvalidElement=productSubmitErrorElement || flyerProductsSection;}
    if (productGatherError) {
        isFormValid = false;
        validationErrors.push("Error retrieving some product data. Please check products or refresh.");
     }
    let finalSocialCount = 0; products.forEach(p => { if(p.includeInSocial) finalSocialCount++; });
    if (finalSocialCount > MAX_SOCIAL_ITEMS) {
        isFormValid = false;
        validationErrors.push(`Too many items marked for social media (Max ${MAX_SOCIAL_ITEMS}, selected ${finalSocialCount}).`);
        if (socialCounterDisplay) {socialCounterDisplay.classList.add('warning'); if(!firstInvalidElement) firstInvalidElement=socialMediaSection;}
    } else {
        if (socialCounterDisplay) socialCounterDisplay.classList.remove('warning');
    }
    if (!isFormValid) {
        if(formErrorElement) { formErrorElement.innerHTML = '<strong>Please correct the following issues:</strong><br>' + validationErrors.join('<br>'); formErrorElement.style.display = 'block'; formErrorElement.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
        else { alert('Please fix validation errors:\n- ' + validationErrors.join('\n- '));}
        if (firstInvalidElement && formErrorElement && firstInvalidElement !== formErrorElement && typeof firstInvalidElement.focus === 'function'){firstInvalidElement.focus();}
        console.error("Submit Validation Failed:", validationErrors);
        return;
    }
    console.log("Validation passed. Gathering data for submission...");
    const socialMediaItems = []; products.forEach(p => { if (p.includeInSocial) { socialMediaItems.push({ id: p.id, name: p.productName }); } });
    const printRequests = { priceTags: reqPriceTagsCheckbox?.checked || false, posters: reqPostersCheckbox?.checked || false, inStoreSignage: reqSignageCheckbox?.checked || false, notes: printNotesTextarea?.value.trim() || '', };
    const now = new Date(); const canadaPostFlyerChecked = document.getElementById('canadaPostFlyer')?.checked || false; const digitalInStoreFlyerChecked = document.getElementById('digitalInStoreFlyer')?.checked || false;
    const finalFormData = { storeName: storeNameInput?.value.trim() || '', submittedBy: submittedByInput?.value.trim() || '', storeId: `STORE_${(storeNameInput?.value || 'UNKNOWN').trim().replace(/\s+/g, '_').toUpperCase()}`, submissionDate: now.toISOString(), lastUpdated: now.toISOString(), flyerValidStartDate: startDateInput?.value || '', flyerValidEndDate: endDateInput?.value || '', generalNotes: generalNotesTextarea?.value.trim() || '', canadaPostFlyer: canadaPostFlyerChecked, digitalInStoreFlyer: digitalInStoreFlyerChecked, products: products, socialMediaItems: socialMediaItems, printRequests: printRequests, };
    console.log("Submitting Data to /api/submit:", finalFormData);
    try {
        const response = await fetch('/api/submit', { method: 'POST', headers: { 'Content-Type': 'application/json', }, body: JSON.stringify(finalFormData), });
        if (response.ok) {
            const result = await response.json(); console.log("Submit Success:", result); showSuccessModal(`Flyer submission successful! Submission ID: ${result.submissionId || 'N/A'}`);
            flyerForm.reset(); productDataStore.clear(); initializeFlyerGrid(); if(additionalPagesContainer) additionalPagesContainer.innerHTML = ''; currentAdditionalPagesCount = 0; renderSocialMediaList(); initializeFlyerCountdown();
            activeEditingSectionElement = flyerProductsSection; if (activeEditingSectionElement) { activeEditingSectionElement.dataset.editing = 'true'; activeEditingSectionElement.dataset.dirty = 'false'; const flyerEditSaveBtn = activeEditingSectionElement.querySelector('#editSaveFlyerBtn'); if(flyerEditSaveBtn){ flyerEditSaveBtn.textContent = 'Save Page'; flyerEditSaveBtn.dataset.mode = 'save'; flyerEditSaveBtn.classList.remove('button-secondary'); flyerEditSaveBtn.classList.add('button-primary'); } } else { activeEditingSectionElement = null; } isCurrentSectionDirty = false; updateFormDisabledState();
        } else {
            let errorMsg = `Server Error: ${response.status} ${response.statusText}`; try { const errData = await response.json(); errorMsg = errData.message || errorMsg; } catch(e){ console.warn("Could not parse error response as JSON."); }
            if(formErrorElement) { formErrorElement.textContent = `Submission Error: ${errorMsg}`; formErrorElement.style.display = 'block'; formErrorElement.scrollIntoView({behavior: 'smooth'}); } else { alert(`Submission Error: ${errorMsg}`);}
        }
    } catch (error) {
        console.error('Submit Network error:', error);
        if(formErrorElement) { formErrorElement.textContent = 'A network error occurred during submission. Please try again.'; formErrorElement.style.display = 'block'; formErrorElement.scrollIntoView({behavior: 'smooth'}); } else { alert('A network error occurred. Please try again.');}
    }
}
// --- PDF Generation Function ---
async function generateSubmissionPdf() {
    const submissionContentElement = document.getElementById('submissionDetailContent');
    const pdfButtonElement = document.getElementById('extractPdfBtn');
    const modalTitleElement = document.querySelector('#submissionDetailModal h2');
    if (!submissionContentElement) { alert("Error: Could not find submission content to generate PDF."); return; }
    if (typeof html2canvas === 'undefined' || typeof jspdf === 'undefined') { alert("Error: PDF generation libraries (html2canvas or jsPDF) not loaded."); console.error("PDF Libs Missing: html2canvas:", typeof html2canvas, "jspdf:", typeof jspdf); return; }
    const originalButtonDisplay = pdfButtonElement ? pdfButtonElement.style.display : '';
    if (pdfButtonElement) { pdfButtonElement.textContent = 'Generating...'; pdfButtonElement.disabled = true; }
    console.log("Starting PDF generation...");
    try {
        const contentToCapture = submissionDetailContent;
        console.log(`Capturing content. scrollWidth: ${contentToCapture.scrollWidth}, scrollHeight: ${contentToCapture.scrollHeight}`);
        const canvas = await html2canvas(contentToCapture, {
            scale: 2, useCORS: true, logging: true,
            onclone: (documentClone) => {
                const clonedContent = documentClone.getElementById(contentToCapture.id);
                if (clonedContent) {
                    clonedContent.style.backgroundColor = 'white';
                    clonedContent.style.color = 'black';
                    clonedContent.querySelectorAll('.product-page').forEach(page => page.style.display = 'block');
                    const clonedPagination = clonedContent.querySelector('.pagination-controls');
                    if (clonedPagination) clonedPagination.style.display = 'none';
                    clonedContent.querySelectorAll('.submission-product-card').forEach(el => {
                       el.style.boxShadow = 'none';
                       el.style.border = '1px solid #ccc';
                    });
                 }
             }
        });
        console.log("Canvas created from HTML content.");
        const imgData = canvas.toDataURL('image/png', 1.0);
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter', putOnlyUsedFonts: true });
        console.log("jsPDF instance created.");
        const imgProps = pdf.getImageProperties(imgData);
        const pdfPageWidth = pdf.internal.pageSize.getWidth();
        const pdfPageHeight = pdf.internal.pageSize.getHeight();
        const margin = 40;
        const usableWidth = pdfPageWidth - (margin * 2);
        const aspectRatio = imgProps.width / imgProps.height;
        const scaledImgHeight = usableWidth / aspectRatio;
        const usableHeight = pdfPageHeight - (margin * 2);
        let currentY = margin;
        if (modalTitleElement) {
            pdf.setFontSize(16);
            pdf.text(modalTitleElement.textContent.trim(), pdfPageWidth / 2, currentY, { align: 'center', maxWidth: usableWidth });
            currentY += 30;
        }
        let heightLeft = scaledImgHeight;
        let sourceY = 0;
        while (heightLeft > 5) {
             let spaceOnPage = pdfPageHeight - currentY - margin;
              if (spaceOnPage <= 0 && currentY === margin) {
                   console.warn("Content height might exceed usable page height even on a fresh page.");
                   spaceOnPage = usableHeight;
              } else if (spaceOnPage <= 0) {
                  pdf.addPage();
                  currentY = margin;
                  spaceOnPage = usableHeight;
             }
            const drawHeightOnPage = Math.min(heightLeft, spaceOnPage);
            const sourceDrawHeight = drawHeightOnPage * (imgProps.height / scaledImgHeight);
             if (usableWidth > 0 && drawHeightOnPage > 0 && imgProps.width > 0 && sourceDrawHeight > 0) {
                 pdf.addImage(imgData, 'PNG', margin, currentY, usableWidth, drawHeightOnPage, null, 'FAST', 0, sourceY, sourceDrawHeight );
                 heightLeft -= drawHeightOnPage;
                 currentY += drawHeightOnPage;
                 sourceY += sourceDrawHeight;
             } else {
                 console.error("Invalid dimensions for pdf.addImage, stopping loop.", { usableWidth, drawHeightOnPage, sourceY, sourceDrawHeight });
                 heightLeft = 0;
             }
        }
        console.log("Image content added to PDF across pages if necessary.");
        let submissionId = "submission_details";
        const idElement = submissionContentElement.querySelector('.submission-meta p:first-child');
        if (idElement && idElement.textContent.toLowerCase().includes('submission id:')) {
            submissionId = idElement.textContent.replace(/submission id:/i, '').trim().replace(/\s+/g, '_') || submissionId;
        }
        pdf.save(`flyer_submission_${submissionId}.pdf`);
        console.log("PDF saved.");
    } catch (error) {
        console.error("Error during PDF generation:", error);
        alert("An error occurred while generating the PDF. Please check the console for details. Error: " + error.message);
    } finally {
        if (pdfButtonElement) { pdfButtonElement.textContent = 'Extract as PDF'; pdfButtonElement.disabled = false; }
        console.log("PDF generation process finished.");
    }
}

// --- Global Initialization ---
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeForm);
} else {
    initializeForm();
}