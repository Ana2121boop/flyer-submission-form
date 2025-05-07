// --- Constants & State ---
const MAX_SOCIAL_ITEMS = 7;
let currentEditProductId = null; // Used when editing a specific product
const productDataStore = new Map(); // In-memory store for product data

const MAX_FLYER_PRODUCTS = 8;
const MAX_NEW_PAGE_PRODUCTS = 16;
const MAX_ADDITIONAL_PAGES = 8; // Limit for dynamically added pages

let filledFlyerSlots = 0;
// Removed global pageCounter, numbering is dynamic now
let currentAdditionalPagesCount = 0; // Counter for added additional pages (for limit)
let activeCellForEditing = null; // Keeps track of which placeholder cell or existing cell's container is being targeted

// --- DOM Element References ---
// These will be assigned in initializeForm()
let storeNameInput, submittedByInput, submissionDateElement, lastUpdatedElement,
    startDateInput, endDateInput, generalNotesTextarea, productEditArea, productFormFieldsContainer,
    saveProductBtn, cancelProductBtn, productFormFieldsTemplate,
    productDisplayTemplate, productSubmitErrorElement, productEditErrorElement, socialItemsListDiv,
    addSocialBtn, socialItemTemplate, socialMediaSection, socialLimitError, socialProductError,
    reqPriceTagsCheckbox, reqPostersCheckbox, reqSignageCheckbox, printNotesTextarea,
    flyerForm, formErrorElement, successModal, modalMessage, modalCloseBtn,
    showAdminLoginBtn, adminSection, adminLogin, adminLoginForm, adminUsername, adminPassword,
    adminLoginError, adminDashboard, adminLogoutBtn, adminSubmissionsList,
    submissionDetailModal, submissionDetailContent, submissionDetailCloseBtn,
    flyerProductsGrid, flyerProductCounterDisplay,
    addNewPageBtn, additionalPagesContainer, newPageSectionTemplate,
    productEditModal, productEditCloseBtn,
    editSaveFlyerBtn; // Button for Flyer Page actions


// --- Utility Functions --- (Your existing functions)
function generateUUID() { return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8); return v.toString(16); }); }
function formatDate(date) { if (!(date instanceof Date) || isNaN(date.getTime())) { date = new Date(); } const y = date.getFullYear(), m = (date.getMonth() + 1).toString().padStart(2, '0'), d = date.getDate().toString().padStart(2, '0'); return `${y}-${m}-${d}`; }
function formatDateTime(date) { if (!(date instanceof Date) || isNaN(date.getTime())) { date = new Date(); } const opts = { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }; return date.toLocaleString(undefined, opts); }
function escapeHtml(unsafe) { if (typeof unsafe !== 'string') { if (unsafe === null || typeof unsafe === 'undefined') return ''; try { return String(unsafe); } catch { return ''; } } return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;"); }

// --- Product Specific Functions ---
function calculateDiscount(formArea) { /* Your existing function */ if (!formArea) return; const regularPriceInput = formArea.querySelector('input[name="regularPrice"]'); const salePriceInput = formArea.querySelector('input[name="salePrice"]'); const discountInput = formArea.querySelector('input.discount-display'); if (!regularPriceInput || !salePriceInput || !discountInput) { return; } salePriceInput.setCustomValidity(""); discountInput.value = ''; const regularPrice = parseFloat(regularPriceInput.value); const salePrice = parseFloat(salePriceInput.value); if (!isNaN(regularPrice) && !isNaN(salePrice) && regularPrice > 0) { if (salePrice >= 0 && salePrice < regularPrice) { const discount = ((regularPrice - salePrice) / regularPrice) * 100; discountInput.value = discount.toFixed(1) + '%'; } else if (salePrice >= regularPrice) { if(salePriceInput.value !== "") { salePriceInput.setCustomValidity("Sale price must be less than regular price."); } } else { salePriceInput.setCustomValidity("Please enter a valid, non-negative sale price."); } } else if (regularPrice <= 0 && regularPriceInput.value !== "") { regularPriceInput.setCustomValidity("Regular price must be greater than zero."); } }
function handleImagePreview(event, previewContainer) { /* Your existing function */ const input = event.target; if (!previewContainer || !input || !input.files) { if(previewContainer) previewContainer.innerHTML = '<small>No image selected.</small>'; return; } previewContainer.innerHTML = '<small>No image selected.</small>'; if (input.files && input.files[0]) { const file = input.files[0]; if (!file.type.startsWith('image/')) { previewContainer.innerHTML = '<small style="color: red;">Invalid file type.</small>'; input.value = ''; return; } const maxSizeMB = 5; const maxSize = maxSizeMB * 1024 * 1024; if (file.size > maxSize) { previewContainer.innerHTML = `<small style="color: red;">File too large (Max ${maxSizeMB}MB).</small>`; input.value = ''; return; } const reader = new FileReader(); reader.onload = function(e) { if (!e.target?.result) return; previewContainer.innerHTML = ''; const img = document.createElement('img'); img.src = e.target.result; img.alt = "Image Preview"; img.style.maxWidth = '100px'; img.style.maxHeight = '100px'; img.style.marginRight = '5px'; const fileNameSpan = document.createElement('span'); fileNameSpan.textContent = ` (${file.name})`; previewContainer.appendChild(img); previewContainer.appendChild(fileNameSpan); }; reader.onerror = function() { console.error("Error reading file:", reader.error); previewContainer.innerHTML = '<small style="color: red;">Error reading file.</small>'; input.value = ''; }; reader.readAsDataURL(file); } }

// MODIFIED: showProductForm - Populates form if editing, shows modal
function showProductForm() {
    console.log("DEBUG: showProductForm CALLED! Editing ID:", currentEditProductId);
    if (!productFormFieldsContainer || !productFormFieldsTemplate || !productEditArea || !saveProductBtn || !cancelProductBtn || !productEditErrorElement || !productEditModal) { console.error("ShowProductForm Error: Essential elements missing!"); alert("Error: Could not display product form."); return; }

    productEditErrorElement.style.display = 'none';
    productFormFieldsContainer.innerHTML = '';
    const formFieldsFragment = productFormFieldsTemplate.content.cloneNode(true);

    // --- Populate form if editing ---
    if (currentEditProductId) { const productData = getProductDataById(currentEditProductId); if (productData) { console.log("Populating form for editing:", productData); const setVal=(s,v)=>{const e=formFieldsFragment.querySelector(s);if(e)e.value=v||''}; const setChecked=(s,c)=>{const e=formFieldsFragment.querySelector(s);if(e)e.checked=c||!1}; setVal('input[name="productName"]',productData.productName); setVal('input[name="brandName"]',productData.brandName); setVal('select[name="category"]',productData.category); setVal('input[name="sizeDimensions"]',productData.sizeDimensions); setVal('input[name="colourFinish"]',productData.colourFinish); setVal('input[name="sku"]',productData.sku); setVal('input[name="regularPrice"]',productData.regularPrice); setVal('input[name="salePrice"]',productData.salePrice); setVal('textarea[name="specialFeatures"]',productData.specialFeatures); setChecked('input[name="isMainFlyerProduct"]',productData.isMainFlyerProduct); setChecked('input[name="isBundle"]',productData.isBundle); setVal('textarea[name="bundleItems"]',productData.bundleItems); setChecked('input[name="requestStockImage"]',productData.requestStockImage); const bundleCheckboxPopulated=formFieldsFragment.querySelector('.bundle-checkbox'); const bundleItemsDivPopulated=formFieldsFragment.querySelector('.bundle-items-container'); const bundleTextareaPopulated=bundleItemsDivPopulated?.querySelector('textarea[name="bundleItems"]'); if(bundleCheckboxPopulated&&bundleItemsDivPopulated&&bundleTextareaPopulated){bundleItemsDivPopulated.style.display=productData.isBundle?'block':'none';bundleTextareaPopulated.required=productData.isBundle;} const previewDivPopulated=formFieldsFragment.querySelector('.image-preview'); if(productData.imageDataUrl&&previewDivPopulated){previewDivPopulated.innerHTML='';const i=document.createElement('img');i.src=productData.imageDataUrl;i.alt="Image Preview";i.style.maxWidth='100px';i.style.maxHeight='100px';i.style.marginRight='5px';const s=document.createElement('span');s.textContent=` (${productData.imageFileName||'Stored Image'})`;previewDivPopulated.appendChild(i);previewDivPopulated.appendChild(s)}else if(previewDivPopulated){previewDivPopulated.innerHTML='<small>No image selected.</small>';} const imageInputPopulated=formFieldsFragment.querySelector('.product-image-input'); if(imageInputPopulated)imageInputPopulated.value=''; } else { console.warn("Edit requested but no data for ID:", currentEditProductId); currentEditProductId = null; } }

    // --- Setup listeners within the cloned form fragment ---
    const priceInputs = formFieldsFragment.querySelectorAll('.price-input'); priceInputs.forEach(input => { input.addEventListener('input', () => calculateDiscount(productFormFieldsContainer)); });
    const bundleCheckbox = formFieldsFragment.querySelector('.bundle-checkbox'); const bundleItemsDiv = formFieldsFragment.querySelector('.bundle-items-container'); if (bundleCheckbox && bundleItemsDiv) { const bundleTextarea = bundleItemsDiv.querySelector('textarea[name="bundleItems"]'); bundleCheckbox.addEventListener('change', (e) => { bundleItemsDiv.style.display = e.target.checked ? 'block' : 'none'; if(bundleTextarea) bundleTextarea.required = e.target.checked; }); if (!currentEditProductId) { bundleItemsDiv.style.display = bundleCheckbox.checked ? 'block' : 'none'; if(bundleTextarea) bundleTextarea.required = bundleCheckbox.checked; } }
    const imageInput = formFieldsFragment.querySelector('.product-image-input'); const previewDiv = formFieldsFragment.querySelector('.image-preview'); if (imageInput && previewDiv) { imageInput.addEventListener('change', (event) => handleImagePreview(event, previewDiv)); }

    productFormFieldsContainer.appendChild(formFieldsFragment);
    calculateDiscount(productFormFieldsContainer);

    productEditModal.classList.add('visible'); // Show the modal

    saveProductBtn.removeEventListener('click', saveProduct); cancelProductBtn.removeEventListener('click', cancelProductEdit);
    saveProductBtn.addEventListener('click', saveProduct); cancelProductBtn.addEventListener('click', cancelProductEdit);

    const firstInput = productFormFieldsContainer.querySelector('input, select, textarea'); firstInput?.focus();
}

function hideProductForm() {
    if (productFormFieldsContainer) { productFormFieldsContainer.innerHTML = ''; }
    if(productEditModal) { productEditModal.classList.remove('visible'); } // Hide modal
    currentEditProductId = null; activeCellForEditing = null; // Reset state
    console.log("Product form hidden.");
}

function cancelProductEdit() {
    hideProductForm();
}

// MODIFIED: saveProduct function
function saveProduct() {
    if (!productFormFieldsContainer || !productEditErrorElement) { console.error("Save Error: Form elements missing."); return; }
    // --- Validation ---
    productEditErrorElement.style.display = 'none'; let isValid = true; let firstInvalidElement = null;
    productFormFieldsContainer.querySelectorAll('.invalid').forEach(el => el.classList.remove('invalid')); const inputsToCheck = productFormFieldsContainer.querySelectorAll('input[required]:not([type="checkbox"]), select[required], textarea[required]'); inputsToCheck.forEach(input => { if (!input.checkValidity()) { isValid = false; input.classList.add('invalid'); if (!firstInvalidElement) firstInvalidElement = input; } }); const salePriceInput = productFormFieldsContainer.querySelector('input[name="salePrice"]'); if(salePriceInput) { calculateDiscount(productFormFieldsContainer); if (!salePriceInput.checkValidity()) { isValid = false; salePriceInput.classList.add('invalid'); if (!firstInvalidElement) firstInvalidElement = salePriceInput; } } const bundleCheckbox = productFormFieldsContainer.querySelector('.bundle-checkbox'); const bundleTextarea = productFormFieldsContainer.querySelector('textarea[name="bundleItems"]'); if (bundleCheckbox?.checked && bundleTextarea) { if (!bundleTextarea.checkValidity()) { isValid = false; bundleTextarea.classList.add('invalid'); if (!firstInvalidElement) firstInvalidElement = bundleTextarea; } }
    if (!isValid) { productEditErrorElement.textContent = 'Please correct highlighted fields.'; productEditErrorElement.style.display = 'block'; firstInvalidElement?.focus(); if (salePriceInput && !salePriceInput.checkValidity()) salePriceInput.reportValidity(); if (bundleTextarea && bundleCheckbox?.checked && !bundleTextarea.checkValidity()) bundleTextarea.reportValidity(); return; }
    // --- End Validation ---

    const uniqueId = currentEditProductId || generateUUID();
    const productData = { id: uniqueId };
    // --- Gather Data ---
    try { const getValue=(s)=>productFormFieldsContainer?.querySelector(s)?.value?.trim()||''; const getChecked=(s)=>productFormFieldsContainer?.querySelector(s)?.checked||!1; const getFloat=(s)=>{const v=parseFloat(productFormFieldsContainer?.querySelector(s)?.value); return isNaN(v)?void 0:v}; productData.productName=getValue('input[name="productName"]'); productData.brandName=getValue('input[name="brandName"]'); productData.category=getValue('select[name="category"]'); productData.sizeDimensions=getValue('input[name="sizeDimensions"]'); productData.colourFinish=getValue('input[name="colourFinish"]'); productData.sku=getValue('input[name="sku"]'); productData.regularPrice=getFloat('input[name="regularPrice"]'); productData.salePrice=getFloat('input[name="salePrice"]'); productData.discountPercent=getValue('input.discount-display'); productData.specialFeatures=getValue('textarea[name="specialFeatures"]'); productData.isMainFlyerProduct=getChecked('input[name="isMainFlyerProduct"]'); productData.isBundle=getChecked('input[name="isBundle"]'); productData.bundleItems=getValue('textarea[name="bundleItems"]'); productData.requestStockImage=getChecked('input[name="requestStockImage"]'); const imageInput=productFormFieldsContainer.querySelector('.product-image-input'); const previewImg=productFormFieldsContainer.querySelector('.image-preview img'); if(imageInput?.files&&imageInput.files[0]){const f=imageInput.files[0]; productData.imageFileName=f.name; if(previewImg&&previewImg.src.startsWith('data:image')){productData.imageDataUrl=previewImg.src}}else if(currentEditProductId){const d=getProductDataById(currentEditProductId); if(d){productData.imageFileName=d.imageFileName; productData.imageDataUrl=d.imageDataUrl}}else{productData.imageFileName=void 0; productData.imageDataUrl=void 0} if(!productData.isBundle){productData.bundleItems=void 0} } catch (e){console.error("Error gathering product data:",e); productEditErrorElement.textContent='Error processing form data.'; productEditErrorElement.style.display='block'; return}
    // --- End Gather Data ---

    storeProductData(productData); // Store/update in data store

    if (activeCellForEditing) { // ADDING TO PLACEHOLDER or SAVING EDIT VIA CELL CONTEXT
        const productDisplayClone = productDisplayTemplate.content.cloneNode(true);
        const productItemDiv = productDisplayClone.querySelector('.product-item');
        populateProductDisplayCell(productItemDiv, productData); // Fills template & attaches listeners
        activeCellForEditing.innerHTML = ''; // Clear placeholder or old content
        activeCellForEditing.appendChild(productItemDiv); // Add filled item
        activeCellForEditing.classList.remove('product-placeholder-cell'); // Mark as filled

        // Update relevant counter
        const parentGrid = activeCellForEditing.closest('.products-grid-container');
        if (parentGrid === flyerProductsGrid) { updateFlyerProductCounter(); }
        else if (parentGrid) { const pageSection = parentGrid.closest('.page-section'); if (pageSection) { updateDynamicPageCounter(pageSection); } }
    }

    hideProductForm(); // Hides modal, clears state vars
    updateSocialProductOptions();
    if (productSubmitErrorElement) productSubmitErrorElement.style.display = 'none';
    console.log("Product saved/updated:", productData.id);
}

// HELPER: Populates a product cell DIV from productDisplayTemplate
function populateProductDisplayCell(productItemElement, data) {
    if (!productItemElement || !data) return;
    productItemElement.setAttribute('data-product-id', data.id);
    const displayContentDiv = productItemElement.querySelector('.product-display-content');
    const previewImgElement = productItemElement.querySelector('.product-preview-img');
    // --- Populate Content ---
    if (displayContentDiv) { const formatPrice = (p) => p?.toFixed(2) ?? 'N/A'; const text = (t) => escapeHtml(t) || 'N/A'; displayContentDiv.innerHTML = `<h4>${text(data.productName)} (${text(data.brandName)})</h4><p><strong>Category:</strong> ${text(data.category)}</p><p><strong>Price:</strong> Reg $${formatPrice(data.regularPrice)} / Sale $${formatPrice(data.salePrice)}${data.discountPercent ? ` <span class="product-tag discount-tag">${text(data.discountPercent)} Off</span>` : ''}</p>${data.sku ? `<p><strong>SKU:</strong> ${text(data.sku)}</p>` : ''}${data.sizeDimensions ? `<p><strong>Size:</strong> ${text(data.sizeDimensions)}</p>` : ''}${data.colourFinish ? `<p><strong>Colour:</strong> ${text(data.colourFinish)}</p>` : ''}${data.isMainFlyerProduct ? `<span class="product-tag main-flyer-tag">Main Flyer</span>` : ''} ${data.isBundle ? `<span class="product-tag bundle-tag">Bundle</span> ${data.bundleItems ? `(${text(data.bundleItems)})` : ''}`: ''} ${data.requestStockImage ? `<span class="product-tag stock-image-tag">Req Stock Img</span>` : ''}`; }
    // --- Populate Image ---
    if (previewImgElement) { if (data.imageDataUrl) { previewImgElement.src = data.imageDataUrl; previewImgElement.alt = data.productName || 'Product Preview'; previewImgElement.style.display = 'block'; } else { previewImgElement.style.display = 'none'; previewImgElement.src = ''; previewImgElement.alt = 'Product Preview'; } }
    // --- Attach Listeners ---
    const editBtn = productItemElement.querySelector('.edit-product-btn'); const removeBtn = productItemElement.querySelector('.remove-item-btn');
    if (editBtn) { editBtn.removeEventListener('click', handleEditProduct); editBtn.addEventListener('click', handleEditProduct); }
    if (removeBtn) { removeBtn.removeEventListener('click', handleProductCellRemove); removeBtn.addEventListener('click', handleProductCellRemove); }
}

// HANDLER: Edit Product button click
function handleEditProduct(event) {
    const productItemDiv = event.target.closest('.product-item[data-product-id]'); if (!productItemDiv) return;
    const productId = productItemDiv.getAttribute('data-product-id'); if (!productId) return;
    currentEditProductId = productId; activeCellForEditing = productItemDiv.parentNode; // The grid cell div
    console.log("handleEditProduct: Editing product ID", productId);
    showProductForm(); // Will use currentEditProductId to populate
}

// HANDLER: Remove Product button click -> revert cell to placeholder
function handleProductCellRemove(event) {
    const button = event.target; const productItemDiv = button.closest('.product-item[data-product-id]');
    if (productItemDiv) { if (window.confirm('Remove product?')) { const productIdToRemove = productItemDiv.getAttribute('data-product-id'); const parentCell = productItemDiv.parentNode; parentCell.innerHTML = ''; const newPlaceholderButton = createPlaceholderCell().firstElementChild; if(newPlaceholderButton) parentCell.appendChild(newPlaceholderButton); parentCell.classList.add('product-placeholder-cell'); parentCell.removeAttribute('data-product-id'); if (productIdToRemove) { removeProductData(productIdToRemove); cleanupSocialMediaOptions(productIdToRemove); } const gridContainer = parentCell.closest('.products-grid-container'); if (gridContainer === flyerProductsGrid) { updateFlyerProductCounter(); } else if (gridContainer) { const pageSection = gridContainer.closest('.page-section'); if (pageSection) { updateDynamicPageCounter(pageSection); } } updateSocialProductOptions(); console.log(`Product removed: ${productIdToRemove || 'Unknown ID'}, cell reverted.`); } }
}

// HELPER: Create a Placeholder Cell DIV
function createPlaceholderCell() {
    const cell = document.createElement('div'); cell.classList.add('product-item', 'product-placeholder-cell');
    const addButton = document.createElement('button'); addButton.type = 'button'; addButton.classList.add('add-product-in-cell-btn', 'button'); addButton.textContent = '+ Add Product';
    addButton.addEventListener('click', () => { activeCellForEditing = cell; currentEditProductId = null; showProductForm(); });
    cell.appendChild(addButton); return cell;
}

// HELPER: Update Flyer Counter
function updateFlyerProductCounter() {
    if (flyerProductCounterDisplay && flyerProductsGrid) { filledFlyerSlots = Array.from(flyerProductsGrid.children).filter(cell => !cell.classList.contains('product-placeholder-cell') && cell.querySelector('.product-item[data-product-id]')).length; flyerProductCounterDisplay.textContent = `Slots Filled: ${filledFlyerSlots} / ${MAX_FLYER_PRODUCTS}`; }
}

// HELPER: Update Dynamic Page Counter
function updateDynamicPageCounter(pageSectionElement) {
    if(!pageSectionElement) return; const counterP = pageSectionElement.querySelector('.page-product-counter'); const gridContainer = pageSectionElement.querySelector('.new-page-grid'); if(counterP && gridContainer){ const filledSlotsInGrid = Array.from(gridContainer.children).filter(cell => !cell.classList.contains('product-placeholder-cell') && cell.querySelector('.product-item[data-product-id]')).length; counterP.textContent = `Slots Filled: ${filledSlotsInGrid} / ${MAX_NEW_PAGE_PRODUCTS}`; }
}

// FUNCTION: Initialize Page 1 Grid
function initializeFlyerGrid() {
    if (!flyerProductsGrid) return; flyerProductsGrid.innerHTML = '';
    for (let i = 0; i < MAX_FLYER_PRODUCTS; i++) { flyerProductsGrid.appendChild(createPlaceholderCell()); }
    const flyerSection = flyerProductsGrid.closest('.flyer-products-section');
    if (flyerSection) {
        // Ensure section starts in edit mode to match HTML button starting as "Save Page"
        flyerSection.dataset.editing = 'true';
        const editSaveBtn = flyerSection.querySelector('#editSaveFlyerBtn');
        if(editSaveBtn && editSaveBtn.dataset.mode !== 'save'){ // Correct button if HTML was wrong
             editSaveBtn.textContent = 'Save Page';
             editSaveBtn.dataset.mode = 'save';
             editSaveBtn.classList.remove('button-secondary');
             editSaveBtn.classList.add('button-primary');
        }
    }
    updateFlyerProductCounter();
}

// FUNCTION: Initialize a New Page Grid
function initializeNewPageGrid(gridContainer, pageProductCounterDisplay, maxSlots) {
    if (!gridContainer || !pageProductCounterDisplay) return; gridContainer.innerHTML = '';
    for (let i = 0; i < maxSlots; i++) { gridContainer.appendChild(createPlaceholderCell()); }
    pageProductCounterDisplay.textContent = `Slots Filled: 0 / ${maxSlots}`;
    // Ensure the parent page section starts with editing=true matching the template button state
    const pageSection = gridContainer.closest('.page-section');
    if(pageSection) pageSection.dataset.editing = 'true';
}

// HANDLER: Remove Page button click
function handleRemovePage(event) {
    const pageSectionToRemove = event.target.closest('.page-section');
    if (pageSectionToRemove) { if (window.confirm("Remove this page and its products?")) { const productItemsOnPage = pageSectionToRemove.querySelectorAll('.product-item[data-product-id]'); productItemsOnPage.forEach(item => { const productId = item.getAttribute('data-product-id'); if (productId) { removeProductData(productId); cleanupSocialMediaOptions(productId); } }); pageSectionToRemove.remove(); currentAdditionalPagesCount--; if (addNewPageBtn) { addNewPageBtn.disabled = false; } updateSocialProductOptions(); console.log("Page removed. Current additional pages:", currentAdditionalPagesCount); } }
}

// FUNCTION: Toggle Edit/Save Mode for a Page Section
function togglePageEditMode(event) {
    const button = event.target;
    const sectionElement = button.closest('.page-section, .flyer-products-section');
    if (!sectionElement) return;

    const currentMode = button.dataset.mode;

    if (currentMode === 'edit') { // Switching to Save mode (currently says "Edit Page")
        button.textContent = 'Save Page';
        button.dataset.mode = 'save';
        button.classList.remove('button-secondary');
        button.classList.add('button-primary');
        sectionElement.dataset.editing = 'true'; // Enable editing
        console.log(`Section editing enabled.`);
    } else { // Switching to Edit mode (currently says "Save Page")
        // --- Perform "Save Page" Action ---
        // Placeholder: Just show success modal.
        showSuccessModal(`Page "${sectionElement.querySelector('h2, h3')?.textContent}" saved successfully!`);
        // --- End Save Action ---

        button.textContent = 'Edit Page';
        button.dataset.mode = 'edit';
        button.classList.remove('button-primary');
        button.classList.add('button-secondary');
        sectionElement.dataset.editing = 'false'; // Disable editing
        console.log(`Section editing disabled.`);
    }
}


// --- Social Media Functions --- (Adapted)
function updateSocialProductOptions() { /* ... (implementation adapted to scan all grids) ... */ const allProductGrids = [flyerProductsGrid]; if (additionalPagesContainer) { allProductGrids.push(...Array.from(additionalPagesContainer.querySelectorAll('.products-grid-container.new-page-grid'))) } const options = []; allProductGrids.forEach(grid => { if(grid){ grid.querySelectorAll('.product-item[data-product-id]').forEach(item => { const productId = item.getAttribute('data-product-id'); if (productId) { const data = getProductDataById(productId); if (data) { options.push({ value: data.id, text: `${data.productName} (${data.brandName || 'N/A'})` }); } } }); } }); if (socialItemsListDiv) { const socialSelects = socialItemsListDiv.querySelectorAll('.social-product-select'); socialSelects.forEach(select => { const currentValue = select.value; while (select.options.length > 1) select.remove(1); options.forEach(opt => { const option = document.createElement('option'); option.value = opt.value; option.textContent = opt.text; select.appendChild(option); }); select.value = options.some(opt => opt.value === currentValue) ? currentValue : ""; }); } const hasProducts = options.length > 0; if (addSocialBtn && socialProductError) { const currentSocialCount = socialItemsListDiv ? socialItemsListDiv.querySelectorAll('.social-item').length : 0; addSocialBtn.disabled = !hasProducts || (currentSocialCount >= MAX_SOCIAL_ITEMS); socialProductError.style.display = hasProducts ? 'none' : 'block'; } }
function cleanupSocialMediaOptions(removedProductId) { /* ... (implementation adapted) ... */ if (!removedProductId || !socialItemsListDiv) return; const socialItems = socialItemsListDiv.querySelectorAll('.social-item'); socialItems.forEach(item => { const select = item.querySelector('select[name="socialProductId"]'); if (select && select.value === removedProductId) { select.value = ""; } }); if (addSocialBtn) { const allProductGrids = [flyerProductsGrid]; if (additionalPagesContainer) { allProductGrids.push(...Array.from(additionalPagesContainer.querySelectorAll('.products-grid-container.new-page-grid'))); } const productItemElements = allProductGrids.flatMap(grid => grid ? Array.from(grid.querySelectorAll('.product-item[data-product-id]')) : []); const hasProducts = productItemElements.length > 0; const currentSocialCount = socialItemsListDiv.querySelectorAll('.social-item').length; addSocialBtn.disabled = !hasProducts || (currentSocialCount >= MAX_SOCIAL_ITEMS); } if(socialLimitError) socialLimitError.style.display = 'none'; }
function addSocialItem() { /* ... (implementation adapted) ... */ if (!socialItemsListDiv || !socialItemTemplate || !addSocialBtn || !socialLimitError) return; const allProductGrids = [flyerProductsGrid]; if (additionalPagesContainer) { allProductGrids.push(...Array.from(additionalPagesContainer.querySelectorAll('.products-grid-container.new-page-grid'))); } const productItemElements = allProductGrids.flatMap(grid => grid ? Array.from(grid.querySelectorAll('.product-item[data-product-id]')) : []); const hasProducts = productItemElements.length > 0; const currentSocialItemsCount = socialItemsListDiv.querySelectorAll('.social-item').length; if (!hasProducts || currentSocialItemsCount >= MAX_SOCIAL_ITEMS) { if(socialLimitError) socialLimitError.style.display = currentSocialItemsCount >= MAX_SOCIAL_ITEMS ? 'block' : 'none'; return; } if(socialLimitError) socialLimitError.style.display = 'none'; const socialFragment = socialItemTemplate.content.cloneNode(true); const socialItemElement = socialFragment.querySelector('.social-item'); if (!socialItemElement) return; const uniqueId = generateUUID(); socialItemElement.setAttribute('data-social-id', uniqueId); const removeBtn = socialItemElement.querySelector('.remove-item-btn'); removeBtn?.addEventListener('click', removeSocialItem); socialItemsListDiv.appendChild(socialItemElement); updateSocialProductOptions(); addSocialBtn.disabled = (socialItemsListDiv.querySelectorAll('.social-item').length >= MAX_SOCIAL_ITEMS); }
function removeSocialItem(event) { /* ... (implementation adapted) ... */ const button = event.target; const socialItem = button.closest('.social-item'); if (socialItem) { socialItem.remove(); if(socialLimitError) socialLimitError.style.display = 'none'; if (addSocialBtn) { const allProductGrids = [flyerProductsGrid]; if (additionalPagesContainer) { allProductGrids.push(...Array.from(additionalPagesContainer.querySelectorAll('.products-grid-container.new-page-grid'))); } const productItemElements = allProductGrids.flatMap(grid => grid ? Array.from(grid.querySelectorAll('.product-item[data-product-id]')) : []); const hasProducts = productItemElements.length > 0; const currentSocialCount = socialItemsListDiv?.querySelectorAll('.social-item').length ?? 0; addSocialBtn.disabled = !hasProducts || (currentSocialCount >= MAX_SOCIAL_ITEMS); } console.log("Social item removed."); } }

// --- Modal Functions --- (Your existing functions)
function showSuccessModal(message) { if (modalMessage) { modalMessage.textContent = message; } if (successModal) { successModal.classList.add('visible'); } else { alert(message + "\n(Modal failed.)"); console.error("Success Modal element not found!"); } }
function closeSuccessModal() { if (successModal) { successModal.classList.remove('visible'); } }
function showSubmissionDetailModal(submissionData) { /* Your existing implementation */ if (!submissionDetailModal || !submissionDetailContent || !submissionDetailCloseBtn) { console.error("Detail modal elements missing!"); alert("Error showing details."); return; } console.log("Displaying details for submission ID:", submissionData?.id); submissionDetailContent.innerHTML = '<p>Loading...</p>'; const formData = submissionData?.form_data || {}; const submittedAt = submissionData?.submitted_at ? formatDateTime(new Date(submissionData.submitted_at)) : 'N/A'; let detailsHtml = `<p><strong>Submission ID:</strong> ${escapeHtml(submissionData?.id)}</p><p><strong>Submitted At:</strong> ${escapeHtml(submittedAt)}</p><p><strong>Store Name:</strong> ${escapeHtml(formData.storeName)}</p><p><strong>Submitted By:</strong> ${escapeHtml(formData.submittedBy)}</p><p><strong>Flyer Start:</strong> ${escapeHtml(formData.flyerValidStartDate)}</p><p><strong>Flyer End:</strong> ${escapeHtml(formData.flyerValidEndDate)}</p><p><strong>General Notes:</strong></p><pre>${escapeHtml(formData.generalNotes)}</pre><hr>`; detailsHtml += '<h3>Products</h3>'; if (formData.products && formData.products.length > 0) { formData.products.forEach((product, index) => { detailsHtml += `<div class="product-detail-item"><h4>Product ${index + 1}: ${escapeHtml(product.productName)} (${escapeHtml(product.brandName)})</h4>${product.imageDataUrl ? `<img src="${escapeHtml(product.imageDataUrl)}" alt="${escapeHtml(product.productName)}" style="max-width: 100px; max-height: 100px; float: right; margin-left: 10px;">` : '<p style="float: right; font-size: 0.8em; color: #777;">(No Image)</p>'}<p><strong>Category:</strong> ${escapeHtml(product.category)}</p><p><strong>Price:</strong> Reg $${product.regularPrice?.toFixed(2) ?? 'N/A'} / Sale $${product.salePrice?.toFixed(2) ?? 'N/A'} (${escapeHtml(product.discountPercent)})</p>${product.sku ? `<p><strong>SKU:</strong> ${escapeHtml(product.sku)}</p>` : ''}${product.sizeDimensions ? `<p><strong>Size:</strong> ${escapeHtml(product.sizeDimensions)}</p>` : ''}${product.colourFinish ? `<p><strong>Colour:</strong> ${escapeHtml(product.colourFinish)}</p>` : ''}${product.isBundle ? `<p><strong>Bundle Items:</strong> ${escapeHtml(product.bundleItems)}</p>` : ''}<p style="clear: both;"><strong>Flags:</strong> ${product.isMainFlyerProduct ? `<span class="product-tag main-flyer-tag">Main</span>` : ''} ${product.isBundle ? `<span class="product-tag bundle-tag">Bundle</span>` : ''} ${product.requestStockImage ? `<span class="product-tag stock-image-tag">Req Stock Img</span>` : ''} ${product.imageFileName && !product.imageDataUrl ? `<span class="product-tag">Ref Img: ${escapeHtml(product.imageFileName)}</span>` : ''}</p></div>`;}); } else { detailsHtml += '<p>No products submitted.</p>'; } detailsHtml += '<hr>'; detailsHtml += '<h3>Social Media Items</h3>'; if (formData.socialMediaItems && formData.socialMediaItems.length > 0) { formData.socialMediaItems.forEach(item => { detailsHtml += `<div class="social-detail-item"><p><strong>Product Ref:</strong> ${escapeHtml(item.productName)} (ID: ${escapeHtml(item.productId)})</p><p><strong>Type:</strong> ${escapeHtml(item.postType)}</p><p><strong>Caption:</strong> ${escapeHtml(item.caption)}</p></div>`; }); } else { detailsHtml += '<p>No social items requested.</p>'; } detailsHtml += '<hr>'; detailsHtml += '<h3>Print Requests</h3>'; const pr = formData.printRequests || {}; detailsHtml += `<p><strong>Tags:</strong> ${pr.priceTags ? 'Yes' : 'No'}</p><p><strong>Posters:</strong> ${pr.posters ? 'Yes' : 'No'}</p><p><strong>Signage:</strong> ${pr.inStoreSignage ? 'Yes' : 'No'}</p><p><strong>Notes:</strong></p><pre>${escapeHtml(pr.notes)}</pre>`; submissionDetailContent.innerHTML = detailsHtml; submissionDetailModal.classList.add('visible'); }
function closeSubmissionDetailModal() { if (submissionDetailModal) { submissionDetailModal.classList.remove('visible'); if (submissionDetailContent) submissionDetailContent.innerHTML = '<p>Loading details...</p>'; } }
async function fetchAndDisplaySingleSubmission(submissionId) { /* Your existing implementation */ if (!submissionId) { console.error("No ID for detail fetch."); return; } console.log(`Workspaceing details for ID: ${submissionId}`); if (submissionDetailModal && submissionDetailContent) { submissionDetailContent.innerHTML = '<p>Loading details...</p>'; submissionDetailModal.classList.add('visible'); } else { console.error("Detail modal elements missing."); alert("Loading..."); } const token = sessionStorage.getItem('adminToken'); if (!token) { console.error("No token for detail fetch."); if(submissionDetailContent) submissionDetailContent.innerHTML = '<p class="error-message">Not logged in.</p>'; return; } try { const response = await fetch(`/api/admin/submission/${submissionId}`, { method: 'GET', headers: { 'Authorization': `Bearer ${token}` } }); if (response.ok) { const submissionData = await response.json(); showSubmissionDetailModal(submissionData); } else if (response.status === 404) { console.error(`Submission ${submissionId} not found.`); if(submissionDetailContent) submissionDetailContent.innerHTML = `<p class="error-message">Error: Submission ${submissionId} not found.</p>`; } else if (response.status === 401 || response.status === 403) { console.error('Unauthorized/Forbidden detail fetch:', response.statusText); sessionStorage.removeItem('adminToken'); if(submissionDetailContent) submissionDetailContent.innerHTML = '<p class="error-message">Session expired.</p>'; setTimeout(closeSubmissionDetailModal, 1500); handleAdminLogout(); } else { const errorResult = await response.text(); console.error('Error fetching detail:', response.status, errorResult); if(submissionDetailContent) submissionDetailContent.innerHTML = `<p class="error-message">Error: ${response.statusText}</p>`; } } catch (error) { console.error('Network error fetching detail:', error); if(submissionDetailContent) submissionDetailContent.innerHTML = '<p class="error-message">Network error.</p>'; } }

// --- Admin Functions --- (Your existing functions)
async function handleAdminLogin(event) { /* Your existing implementation */ event.preventDefault(); console.log("Admin login submitted"); if (!adminUsername || !adminPassword || !adminLoginError || !adminLogin || !adminDashboard) { return; } const username = adminUsername.value; const password = adminPassword.value; adminLoginError.textContent = ''; adminLoginError.style.display = 'none'; if (!username || !password) { adminLoginError.textContent = 'Username/password required.'; adminLoginError.style.display = 'block'; return; } console.log(`Attempting login: ${username}`); try { const response = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json', }, body: JSON.stringify({ username, password }), }); const result = await response.json(); if (response.ok) { console.log('Login OK:', result); sessionStorage.setItem('adminToken', result.token); console.log("Token stored"); adminLogin.style.display = 'none'; adminDashboard.style.display = 'block'; adminPassword.value = ''; loadAdminSubmissions(); } else { console.error('Login failed:', result); adminLoginError.textContent = result.message || 'Login failed.'; adminLoginError.style.display = 'block'; adminPassword.value = ''; } } catch (error) { console.error('Network err login:', error); adminLoginError.textContent = 'Network error.'; adminLoginError.style.display = 'block'; adminPassword.value = ''; } }
function handleAdminLogout() { /* Your existing implementation */ console.log("Logout clicked"); sessionStorage.removeItem('adminToken'); console.log("Token removed"); if (!adminDashboard || !adminLogin || !adminSection || !showAdminLoginBtn || !flyerForm) { return; } adminDashboard.style.display = 'none'; adminSection.style.display = 'none'; adminLogin.style.display = 'block'; flyerForm.style.display = 'block'; showAdminLoginBtn.style.display = 'inline-block'; if(adminUsername) adminUsername.value = ''; if(adminPassword) adminPassword.value = ''; if (adminSubmissionsList) adminSubmissionsList.innerHTML = ''; console.log("Admin logged out."); }
async function loadAdminSubmissions() { /* Your existing implementation */ console.log("Loading submissions..."); if (!adminSubmissionsList) return; const token = sessionStorage.getItem('adminToken'); if (!token) { adminSubmissionsList.innerHTML = '<p class="error-message">Not logged in.</p>'; return; } adminSubmissionsList.innerHTML = '<p>Loading...</p>'; try { const response = await fetch('/api/admin/submissions', { method: 'GET', headers: { 'Authorization': `Bearer ${token}` } }); if (response.ok) { const submissions = await response.json(); displaySubmissions(submissions); } else if (response.status === 401 || response.status === 403) { console.error('Unauthorized/Forbidden:', response.statusText); sessionStorage.removeItem('adminToken'); adminSubmissionsList.innerHTML = '<p class="error-message">Session expired.</p>'; handleAdminLogout(); } else { const errorResult = await response.text(); console.error('Error fetch submissions:', response.status, errorResult); adminSubmissionsList.innerHTML = `<p class="error-message">Error: ${response.statusText}</p>`; } } catch (error) { console.error('Network error loading submissions:', error); adminSubmissionsList.innerHTML = '<p class="error-message">Network error.</p>'; } }
function displaySubmissions(submissions) { /* Your existing implementation */ if (!adminSubmissionsList) { console.error("Cannot find adminSubmissionsList."); return; } adminSubmissionsList.innerHTML = ''; if (!submissions || submissions.length === 0) { adminSubmissionsList.innerHTML = '<p>No submissions found.</p>'; return; } const table = document.createElement('table'); table.className = 'submissions-table'; const thead = table.createTHead(); const headerRow = thead.insertRow(); const headers = ['ID', 'Submitted At', 'Store', 'Submitter', 'Product Count', 'Details']; headers.forEach(text => { const th = document.createElement('th'); th.textContent = text; headerRow.appendChild(th); }); const tbody = table.createTBody(); submissions.forEach(submission => { const row = tbody.insertRow(); row.setAttribute('data-submission-id', submission.id); row.classList.add('submission-row-clickable'); const cellId = row.insertCell(); cellId.textContent = submission.id || 'N/A'; const cellDate = row.insertCell(); cellDate.textContent = submission.submitted_at ? formatDateTime(new Date(submission.submitted_at)) : 'N/A'; const cellStore = row.insertCell(); cellStore.textContent = submission.store_name || 'N/A'; const cellSubmitter = row.insertCell(); cellSubmitter.textContent = submission.submitted_by || 'N/A'; const cellProducts = row.insertCell(); cellProducts.textContent = (typeof submission.product_count === 'number') ? `${submission.product_count}` : 'N/A'; cellProducts.style.textAlign = 'center'; const cellDetails = row.insertCell(); cellDetails.innerHTML = '<small>View Details</small>'; cellDetails.style.textAlign = 'center'; cellDetails.style.verticalAlign = 'middle'; cellDetails.style.color = '#007bff'; cellDetails.style.textDecoration = 'underline'; }); tbody.addEventListener('click', (event) => { const clickedRow = event.target.closest('tr.submission-row-clickable'); if (clickedRow?.dataset.submissionId) { fetchAndDisplaySingleSubmission(clickedRow.dataset.submissionId); } }); adminSubmissionsList.appendChild(table); console.log("Submissions displayed."); }
function checkLoginState() { /* Your existing implementation */ console.log("Checking login state..."); const token = sessionStorage.getItem('adminToken'); if (token) { console.log("Token found, showing dashboard."); if (adminSection && adminLogin && adminDashboard && flyerForm && showAdminLoginBtn) { adminSection.style.display = 'block'; adminLogin.style.display = 'none'; adminDashboard.style.display = 'block'; flyerForm.style.display = 'none'; showAdminLoginBtn.style.display = 'none'; loadAdminSubmissions(); } } else { console.log("No token found, showing public view."); if (adminSection) adminSection.style.display = 'none'; if (flyerForm) flyerForm.style.display = 'block'; if (showAdminLoginBtn) showAdminLoginBtn.style.display = 'inline-block'; } }

// --- Initialization --- (MODIFIED)
function initializeForm() {
    console.log("Initializing form...");
    // --- Assign all element references ---
    storeNameInput=document.getElementById('storeNameInput');submittedByInput=document.getElementById('submittedByInput');submissionDateElement=document.getElementById('submissionDate');lastUpdatedElement=document.getElementById('lastUpdated');startDateInput=document.getElementById('flyerValidStartDate');endDateInput=document.getElementById('flyerValidEndDate');generalNotesTextarea=document.getElementById('generalNotes');productEditArea=document.getElementById('productEditArea');productFormFieldsContainer=document.getElementById('productFormFieldsContainer');
    flyerProductsGrid=document.getElementById('flyerProductsGrid');saveProductBtn=document.getElementById('saveProductBtn');cancelProductBtn=document.getElementById('cancelProductBtn');productFormFieldsTemplate=document.getElementById('productFormFieldsTemplate');productDisplayTemplate=document.getElementById('productDisplayTemplate');productSubmitErrorElement=document.getElementById('productSubmitError');productEditErrorElement=document.getElementById('productEditError');socialItemsListDiv=document.getElementById('socialItemsList');addSocialBtn=document.getElementById('addSocialBtn');socialItemTemplate=document.getElementById('socialItemTemplate');socialMediaSection=document.getElementById('socialMediaSection');socialLimitError=document.getElementById('socialLimitError');socialProductError=document.getElementById('socialProductError');reqPriceTagsCheckbox=document.getElementById('reqPriceTags');reqPostersCheckbox=document.getElementById('reqPosters');reqSignageCheckbox=document.getElementById('reqSignage');printNotesTextarea=document.getElementById('printNotes');flyerForm=document.getElementById('flyerForm');formErrorElement=document.getElementById('formError');successModal=document.getElementById('successModal');modalMessage=document.getElementById('modalMessage');modalCloseBtn=document.getElementById('modalCloseBtn');
    showAdminLoginBtn=document.getElementById('showAdminLoginBtn');adminSection=document.getElementById('adminSection');adminLogin=document.getElementById('adminLogin');adminLoginForm=document.getElementById('adminLoginForm');adminUsername=document.getElementById('adminUsername');adminPassword=document.getElementById('adminPassword');adminLoginError=document.getElementById('adminLoginError');adminDashboard=document.getElementById('adminDashboard');adminLogoutBtn=document.getElementById('adminLogoutBtn');adminSubmissionsList=document.getElementById('adminSubmissionsList');
    submissionDetailModal=document.getElementById('submissionDetailModal');submissionDetailContent=document.getElementById('submissionDetailContent');submissionDetailCloseBtn=document.getElementById('submissionDetailCloseBtn');
    flyerProductCounterDisplay=document.getElementById('flyerProductCounter');addNewPageBtn=document.getElementById('addNewPageBtn');additionalPagesContainer=document.getElementById('additionalPagesContainer');newPageSectionTemplate=document.getElementById('newPageSectionTemplate');
    productEditModal=document.getElementById('productEditModal'); productEditCloseBtn=document.getElementById('productEditCloseBtn');
    editSaveFlyerBtn=document.getElementById('editSaveFlyerBtn'); // Get flyer edit/save button
    // --- End Assign elements ---

    // Check essential elements
    const essentialElements=[flyerForm,addSocialBtn,successModal,modalCloseBtn,productEditArea,productFormFieldsContainer,saveProductBtn,cancelProductBtn,productFormFieldsTemplate,productDisplayTemplate,socialItemsListDiv,socialItemTemplate,showAdminLoginBtn,adminSection,adminLogin,adminLoginForm,adminDashboard,adminLogoutBtn,adminSubmissionsList,submissionDetailModal,submissionDetailContent,submissionDetailCloseBtn,flyerProductsGrid,flyerProductCounterDisplay,addNewPageBtn,additionalPagesContainer,newPageSectionTemplate,productEditModal,productEditCloseBtn,editSaveFlyerBtn];
    if(essentialElements.some(el=>!el)){console.error("Essential elements missing! Check IDs."); const missingMap={flyerForm:flyerForm,addSocialBtn:addSocialBtn,productEditModal:productEditModal,editSaveFlyerBtn:editSaveFlyerBtn,/*...*/flyerProductsGrid:flyerProductsGrid,addNewPageBtn:addNewPageBtn}; for(const key in missingMap){if(!missingMap[key])console.error(`Missing element: ${key}`);} document.body.innerHTML='<p style="color: red;">Error: Critical page components failed to load.</p>'; return;}

    const now=new Date(); if(submissionDateElement)submissionDateElement.textContent=formatDateTime(now); if(lastUpdatedElement)lastUpdatedElement.textContent=formatDateTime(now);
    if(socialItemsListDiv)socialItemsListDiv.innerHTML='';

    // --- Attach Event Listeners ---
    if(addSocialBtn)addSocialBtn.addEventListener('click',addSocialItem);
    if(flyerForm)flyerForm.addEventListener('submit',handleSubmit);
    if(modalCloseBtn)modalCloseBtn.addEventListener('click',closeSuccessModal);
    if(successModal)successModal.addEventListener('click',(event)=>{if(event.target===successModal){closeSuccessModal();}});
    if(submissionDetailCloseBtn)submissionDetailCloseBtn.addEventListener('click',closeSubmissionDetailModal);
    if(submissionDetailModal)submissionDetailModal.addEventListener('click',(event)=>{if(event.target===submissionDetailModal){closeSubmissionDetailModal();}});
    if(productEditCloseBtn) { productEditCloseBtn.addEventListener('click', hideProductForm); } // Listener for modal close
    if(productEditModal) { productEditModal.addEventListener('click', (event) => { if (event.target === productEditModal) { hideProductForm(); } }); } // Listener for modal overlay click
    if(showAdminLoginBtn&&adminSection&&adminLogin&&adminDashboard&&flyerForm){showAdminLoginBtn.addEventListener('click',()=>{flyerForm.style.display='none';adminSection.style.display='block';adminLogin.style.display='block';adminDashboard.style.display='none';if(adminUsername)adminUsername.focus();showAdminLoginBtn.style.display='none';});}else{console.error("Could not attach Admin Access listener.");}
    if(adminLoginForm){adminLoginForm.addEventListener('submit',handleAdminLogin);}else{console.error("Could not attach Admin Login Form listener.");}
    if(adminLogoutBtn){adminLogoutBtn.addEventListener('click',handleAdminLogout);}else{console.error("Could not attach Admin Logout Button listener.");}

    // Initialize Page 1 Grid
    initializeFlyerGrid();

    // Attach listener for Page 1 Edit/Save Button
    if(editSaveFlyerBtn) {
        editSaveFlyerBtn.addEventListener('click', togglePageEditMode);
    }

    // Add New Page Button Listener (incorporates bug fixes and new button logic)
    if (addNewPageBtn) {
        addNewPageBtn.addEventListener('click', () => {
            if (currentAdditionalPagesCount >= MAX_ADDITIONAL_PAGES) {
                alert(`Maximum of ${MAX_ADDITIONAL_PAGES} additional pages reached.`); return;
            }
            // Calculate dynamic page number based on current pages + initial flyer page
            const existingPagesCount = additionalPagesContainer ? additionalPagesContainer.querySelectorAll('.page-section').length : 0;
            const newPageNumber = existingPagesCount + 2; // Page 1 = Flyer, Page 2 = first dynamic, etc.

            currentAdditionalPagesCount++; // Increment limit counter

            const newPageClone = newPageSectionTemplate.content.cloneNode(true);
            const newPageSection = newPageClone.querySelector('.page-section');
            newPageSection.querySelector('.page-title').textContent = `Additional Products (Page ${newPageNumber} - Max ${MAX_NEW_PAGE_PRODUCTS} Slots)`;
            const newGrid = newPageSection.querySelector('.new-page-grid');
            const newCounterDisplay = newPageSection.querySelector('.page-product-counter');
            const removePageBtn = newPageSection.querySelector('.remove-page-btn');
            const editSavePageBtn = newPageSection.querySelector('.edit-save-page-btn'); // Find the toggle button

            if(removePageBtn){ removePageBtn.addEventListener('click', handleRemovePage); }
            if(editSavePageBtn){ // Attach toggle function to THIS page's button
                 editSavePageBtn.addEventListener('click', togglePageEditMode);
            }

            initializeNewPageGrid(newGrid, newCounterDisplay, MAX_NEW_PAGE_PRODUCTS);
            if(additionalPagesContainer) additionalPagesContainer.appendChild(newPageSection);
            if (currentAdditionalPagesCount >= MAX_ADDITIONAL_PAGES) { addNewPageBtn.disabled = true; }
        });
    }

    updateSocialProductOptions();
    console.log("Form Initialized successfully.");
    checkLoginState();
}

// --- Form Submission Handler (Main Form) --- (Adapted for all grids)
async function handleSubmit(event) {
    event.preventDefault(); if (!flyerForm || !flyerProductsGrid) { console.error("Submit Error: Form or Flyer Grid missing."); return; }
    console.log("Form submission initiated..."); if(formErrorElement) { formErrorElement.textContent = ''; formErrorElement.style.display = 'none'; } if(productSubmitErrorElement) { productSubmitErrorElement.style.display = 'none'; }
    flyerForm.querySelectorAll('.invalid').forEach(el => el.classList.remove('invalid')); let isFormValid = true; let firstInvalidElement = null; const validationErrors = [];
    const mainFormInputs = flyerForm.querySelectorAll('#storeNameInput, #submittedByInput, #flyerValidStartDate, #flyerValidEndDate'); mainFormInputs.forEach(input => { if (!input.checkValidity()) { isFormValid = false; input.classList.add('invalid'); if (!firstInvalidElement) firstInvalidElement = input; const label = flyerForm?.querySelector(`label[for="${input.id}"]`)?.textContent || input.name || input.id; validationErrors.push(`${label.replace(':*', '').trim()} is required or invalid.`); } });
    if (startDateInput && endDateInput) { const startDate = startDateInput.value; const endDate = endDateInput.value; endDateInput.setCustomValidity(""); if (startDate && endDate && endDate < startDate) { isFormValid = false; endDateInput.classList.add('invalid'); endDateInput.setCustomValidity("End Date < Start Date."); if (!firstInvalidElement) firstInvalidElement = endDateInput; validationErrors.push("End Date < Start Date."); } }
    const products = []; let productGatherError = false; const allProductGrids = [flyerProductsGrid]; if(additionalPagesContainer){ allProductGrids.push(...Array.from(additionalPagesContainer.querySelectorAll('.products-grid-container.new-page-grid'))); }
    allProductGrids.forEach(grid => { if(grid){ grid.querySelectorAll('.product-item[data-product-id]').forEach(item => { const id = item.getAttribute('data-product-id'); if (id) { const productData = getProductDataById(id); if(productData) { products.push(productData); } else { console.error(`CRITICAL: No data in store for ID: ${id}.`); productGatherError = true; } } }); } });
    if (products.length === 0) { isFormValid = false; if(productSubmitErrorElement) productSubmitErrorElement.style.display = 'block'; validationErrors.push("At least one product must be added."); }
    if (productGatherError) { isFormValid = false; validationErrors.push("Internal error retrieving product data."); }
    if (!isFormValid) { if(formErrorElement) { formErrorElement.innerHTML = 'Fix issues:<br>' + validationErrors.join('<br>'); formErrorElement.style.display = 'block'; } firstInvalidElement?.focus(); if (endDateInput && !endDateInput.checkValidity() && endDateInput.validationMessage) { endDateInput.reportValidity(); } console.error("Submit Validation Failed:", validationErrors); return; }
    console.log("Validation passed. Gathering data..."); const socialMediaItems = []; const socialElements = socialItemsListDiv?.querySelectorAll('.social-item'); socialElements?.forEach(item => { const id = item.getAttribute('data-social-id') || generateUUID(); const productIdSelect = item.querySelector('select[name="socialProductId"]'); const postTypeSelect = item.querySelector('select[name="socialPostType"]'); const captionInput = item.querySelector('input[name="socialCaption"]'); if (productIdSelect?.value && postTypeSelect?.value) { const selectedOption = productIdSelect.options[productIdSelect.selectedIndex]; const productNameRef = selectedOption ? selectedOption.text : 'N/A'; socialMediaItems.push({ id, productId: productIdSelect.value, productName: productNameRef, caption: captionInput?.value.trim() || '', postType: postTypeSelect.value }); } });
    const printRequests = { priceTags: reqPriceTagsCheckbox?.checked || false, posters: reqPostersCheckbox?.checked || false, inStoreSignage: reqSignageCheckbox?.checked || false, notes: printNotesTextarea?.value.trim() || '', }; const now = new Date();
    const finalFormData = { storeName: storeNameInput?.value.trim() || '', submittedBy: submittedByInput?.value.trim() || '', storeId: `STORE_${(storeNameInput?.value || 'UNKNOWN').trim().replace(/\s+/g, '_').toUpperCase()}`, submissionDate: now.toISOString(), lastUpdated: now.toISOString(), flyerValidStartDate: startDateInput?.value || '', flyerValidEndDate: endDateInput?.value || '', generalNotes: generalNotesTextarea?.value.trim() || '', products: products, socialMediaItems: socialMediaItems, printRequests: printRequests, };
    console.log("Submitting Data to /api/submit:", finalFormData);
    try {
        const response = await fetch('/api/submit', { method: 'POST', headers: { 'Content-Type': 'application/json', }, body: JSON.stringify(finalFormData), });
        if (response.ok) {
            const result = await response.json(); console.log("Submit Success:", result); showSuccessModal(`Flyer submission successful! ID: ${result.submissionId || 'N/A'}`);
            flyerForm.reset(); productDataStore.clear();
            initializeFlyerGrid(); // Reset page 1
            if(additionalPagesContainer) additionalPagesContainer.innerHTML = ''; // Clear dynamic pages
            currentAdditionalPagesCount = 0; // Reset dynamic page counter
            if(addNewPageBtn) addNewPageBtn.disabled = false; // Re-enable add page button
            if(socialItemsListDiv) socialItemsListDiv.innerHTML = '';
            updateSocialProductOptions();
            if(submissionDateElement) submissionDateElement.textContent = formatDateTime(new Date()); if(lastUpdatedElement) lastUpdatedElement.textContent = formatDateTime(new Date());
        } else {
            let errorMsg = `Server Error: ${response.status} ${response.statusText}`; try { const errorResult = await response.json(); errorMsg = errorResult.message || errorMsg; console.error(`Submit Backend error: ${response.status}`, errorResult); } catch (jsonError) { console.error(`Submit Backend error: ${response.status}. Not JSON. Body:`, await response.text()); }
            if(formErrorElement) { formErrorElement.textContent = `Submission Error: ${errorMsg}`; formErrorElement.style.display = 'block'; } else { alert(`Submission Error: ${errorMsg}`); }
        }
    } catch (error) { console.error('Submit Network/fetch error:', error); if(formErrorElement) { formErrorElement.textContent = 'Network error. Check connection.'; formErrorElement.style.display = 'block'; } else { alert('Network error.'); } }
}


// --- Helper Functions for In-Memory Data Store --- (Your existing functions)
function storeProductData(data) { if (!data || !data.id) return; productDataStore.set(data.id, data); }
function getProductDataById(id) { return productDataStore.get(id); }
function removeProductData(id) { productDataStore.delete(id); }

// --- Global Initialization ---
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeForm);
} else {
    initializeForm();
}