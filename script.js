// --- Constants & State ---
const MAX_SOCIAL_ITEMS = 7;
let currentEditProductId = null; // Track if we are editing an existing product

/**
 * In-memory store for product data.
 * IMPORTANT: This data is lost when the page is refreshed or closed.
 */
const productDataStore = new Map();

// --- DOM Element References (Declared globally, assigned in initializeForm) ---
let storeNameInput;
let submittedByInput;
let submissionDateElement;
let lastUpdatedElement;
let approvalStatusSelect;
let startDateInput;
let endDateInput;
let generalNotesTextarea;
let productEditArea;
let productFormFieldsContainer;
let productListDiv;
let addProductBtn;
let saveProductBtn;
let cancelProductBtn;
let productFormFieldsTemplate;
let productDisplayTemplate;
let productSubmitErrorElement;
let productEditErrorElement;
let socialItemsListDiv;
let addSocialBtn;
let socialItemTemplate;
let socialMediaSection;
let socialLimitError;
let socialProductError;
let reqPriceTagsCheckbox;
let reqPostersCheckbox;
let reqSignageCheckbox;
let printNotesTextarea;
let flyerForm;
let formErrorElement;
let successModal;
let modalMessage;
let modalCloseBtn;


// --- Utility Functions ---

/** Generates a simple pseudo-random UUID */
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/** Formats a Date object into YYYY-MM-DD */
function formatDate(date) {
     const year = date.getFullYear();
     const month = (date.getMonth() + 1).toString().padStart(2, '0');
     const day = date.getDate().toString().padStart(2, '0');
     return `${year}-${month}-${day}`;
}

/** Formats a Date object into a locale-specific date and time string */
function formatDateTime(date) {
     const options = {
         year: 'numeric', month: 'short', day: 'numeric',
         hour: 'numeric', minute: '2-digit', hour12: true
     };
     return date.toLocaleString(undefined, options);
}

// --- Product Specific Functions ---

/** Calculates discount and sets custom validity on salePriceInput */
function calculateDiscount(formArea) {
    if (!formArea) return;
    const regularPriceInput = formArea.querySelector('input[name="regularPrice"]');
    const salePriceInput = formArea.querySelector('input[name="salePrice"]');
    const discountInput = formArea.querySelector('input.discount-display');

    if (!regularPriceInput || !salePriceInput || !discountInput) { return; }

    salePriceInput.setCustomValidity("");
    discountInput.value = '';

    const regularPrice = parseFloat(regularPriceInput.value);
    const salePrice = parseFloat(salePriceInput.value);

    if (!isNaN(regularPrice) && !isNaN(salePrice) && regularPrice > 0 && salePrice > 0) {
         if (salePrice < regularPrice) {
             const discount = ((regularPrice - salePrice) / regularPrice) * 100;
             discountInput.value = discount.toFixed(1) + '%';
         } else {
             salePriceInput.setCustomValidity("Sale price must be less than regular price.");
         }
    }
}

/** Handles image selection and displays a preview */
function handleImagePreview(event, previewContainer) {
    const input = event.target;
    if (!previewContainer || !input) return;
    previewContainer.innerHTML = '<small>No image selected.</small>';

    if (input.files && input.files[0]) {
        const file = input.files[0];
        if (!file.type.startsWith('image/')) {
            previewContainer.innerHTML = '<small style="color: red;">Invalid file type. Please select an image.</small>';
            input.value = ''; return;
        }
        const maxSizeMB = 5; const maxSize = maxSizeMB * 1024 * 1024;
        if (file.size > maxSize) {
            previewContainer.innerHTML = `<small style="color: red;">File too large (Max ${maxSizeMB}MB).</small>`;
            input.value = ''; return;
        }
        const reader = new FileReader();
        reader.onload = function(e) {
            if (!e.target?.result) return;
            previewContainer.innerHTML = '';
            const img = document.createElement('img');
            img.src = e.target.result; img.alt = "Image Preview";
            const fileNameSpan = document.createElement('span');
            fileNameSpan.textContent = ` (${file.name})`;
            previewContainer.appendChild(img); previewContainer.appendChild(fileNameSpan);
        }
        reader.onerror = function() {
            console.error("Error reading file:", reader.error);
            previewContainer.innerHTML = '<small style="color: red;">Error reading file.</small>';
            input.value = '';
        }
        reader.readAsDataURL(file);
    }
}

/** Shows the product editing form */
function showProductForm() {
    console.log("Showing product form...");
    if (!productFormFieldsContainer || !productFormFieldsTemplate || !productEditArea || !addProductBtn || !saveProductBtn || !cancelProductBtn || !productEditErrorElement) {
        console.error("ShowProductForm Error: One or more required elements not found!");
        alert("Error: Could not display the product form. Please check console and refresh."); return;
    }
    productEditErrorElement.style.display = 'none';
    productFormFieldsContainer.innerHTML = '';
    const formFieldsFragment = productFormFieldsTemplate.content.cloneNode(true);

    const priceInputs = formFieldsFragment.querySelectorAll('.price-input');
    priceInputs.forEach(input => { input.addEventListener('input', () => calculateDiscount(productFormFieldsContainer)); });

    const bundleCheckbox = formFieldsFragment.querySelector('.bundle-checkbox');
    const bundleItemsDiv = formFieldsFragment.querySelector('.bundle-items-container');
    if (bundleCheckbox && bundleItemsDiv) {
        const bundleTextarea = bundleItemsDiv.querySelector('textarea[name="bundleItems"]');
        bundleCheckbox.addEventListener('change', (e) => {
            const isChecked = e.target.checked;
            bundleItemsDiv.style.display = isChecked ? 'block' : 'none';
            if(bundleTextarea) bundleTextarea.required = isChecked;
        });
        bundleItemsDiv.style.display = bundleCheckbox.checked ? 'block' : 'none';
        if(bundleTextarea) bundleTextarea.required = bundleCheckbox.checked;
    }
    const imageInput = formFieldsFragment.querySelector('.product-image-input');
    const previewDiv = formFieldsFragment.querySelector('.image-preview');
    if (imageInput && previewDiv) { imageInput.addEventListener('change', (event) => handleImagePreview(event, previewDiv)); }

    productFormFieldsContainer.appendChild(formFieldsFragment);
    productEditArea.style.display = 'block';
    addProductBtn.style.display = 'none';
    saveProductBtn.removeEventListener('click', saveProduct);
    cancelProductBtn.removeEventListener('click', cancelProductEdit);
    saveProductBtn.addEventListener('click', saveProduct);
    cancelProductBtn.addEventListener('click', cancelProductEdit);
    const firstInput = productFormFieldsContainer.querySelector('input, select, textarea');
    firstInput?.focus();
    console.log("Product form shown successfully.");
}

/** Hides the product editing form */
function hideProductForm() {
    console.log("Hiding product form...");
     if (productFormFieldsContainer) { productFormFieldsContainer.innerHTML = ''; }
     if(productEditArea) productEditArea.style.display = 'none';
     if(addProductBtn) addProductBtn.style.display = 'inline-block';
    currentEditProductId = null;
}

/** Validates and saves product data */
function saveProduct() {
    console.log("Save product button clicked.");
    if (!productFormFieldsContainer || !productEditErrorElement) { console.error("SaveProduct Error: Form container or error element not found."); return; }
    productEditErrorElement.style.display = 'none';
    let isValid = true; let firstInvalidElement = null;
    productFormFieldsContainer.querySelectorAll('.invalid').forEach(el => el.classList.remove('invalid'));

    const inputsToCheck = productFormFieldsContainer.querySelectorAll('input[required]:not([type="checkbox"]), select[required], textarea[required]');
    inputsToCheck.forEach(input => {
        if (!input.checkValidity()) { isValid = false; input.classList.add('invalid'); if (!firstInvalidElement) firstInvalidElement = input; }
    });
    const salePriceInput = productFormFieldsContainer.querySelector('input[name="salePrice"]');
    if(salePriceInput) {
        calculateDiscount(productFormFieldsContainer);
        if (!salePriceInput.checkValidity()) { isValid = false; salePriceInput.classList.add('invalid'); if (!firstInvalidElement) firstInvalidElement = salePriceInput; }
    } else { isValid = false; }
    const bundleCheckbox = productFormFieldsContainer.querySelector('.bundle-checkbox');
    const bundleTextarea = productFormFieldsContainer.querySelector('textarea[name="bundleItems"]');
    if (bundleCheckbox?.checked && bundleTextarea) {
        if (!bundleTextarea.checkValidity()) { isValid = false; bundleTextarea.classList.add('invalid'); if (!firstInvalidElement) firstInvalidElement = bundleTextarea; }
    }
    if (!isValid) {
        productEditErrorElement.textContent = 'Please correct the highlighted fields.';
        productEditErrorElement.style.display = 'block';
        firstInvalidElement?.focus(); console.log("Validation failed in saveProduct."); return;
    }

    const uniqueId = currentEditProductId || generateUUID();
    const productData = { id: uniqueId };
    try {
        productData.productName = productFormFieldsContainer.querySelector('input[name="productName"]').value.trim();
        productData.brandName = productFormFieldsContainer.querySelector('input[name="brandName"]').value.trim();
        productData.category = productFormFieldsContainer.querySelector('select[name="category"]').value;
        productData.sizeDimensions = productFormFieldsContainer.querySelector('input[name="sizeDimensions"]').value.trim();
        productData.colourFinish = productFormFieldsContainer.querySelector('input[name="colourFinish"]').value.trim();
        productData.sku = productFormFieldsContainer.querySelector('input[name="sku"]').value.trim();
        productData.regularPrice = parseFloat(productFormFieldsContainer.querySelector('input[name="regularPrice"]').value);
        productData.salePrice = parseFloat(productFormFieldsContainer.querySelector('input[name="salePrice"]').value);
        productData.discountPercent = productFormFieldsContainer.querySelector('input.discount-display').value;
        productData.isMainFlyerProduct = productFormFieldsContainer.querySelector('input[name="isMainFlyerProduct"]').checked;
        productData.isBundle = productFormFieldsContainer.querySelector('input[name="isBundle"]').checked;
        productData.bundleItems = productFormFieldsContainer.querySelector('textarea[name="bundleItems"]').value.trim();
        productData.requestStockImage = productFormFieldsContainer.querySelector('input[name="requestStockImage"]').checked;
        const imageInput = productFormFieldsContainer.querySelector('.product-image-input');
        const previewImg = productFormFieldsContainer.querySelector('.image-preview img');
        if (imageInput?.files && imageInput.files[0]) {
             const file = imageInput.files[0]; productData.imageFileName = file.name;
             if(previewImg && previewImg.src.startsWith('data:image')) { productData.imageDataUrl = previewImg.src; }
        } else if (currentEditProductId) {
             const existingData = getProductDataById(currentEditProductId);
             if (existingData) { productData.imageFileName = existingData.imageFileName; productData.imageDataUrl = existingData.imageDataUrl; }
        }
        if (!productData.isBundle) { productData.bundleItems = undefined; }
    } catch (error) {
        console.error("Error gathering product data:", error);
        productEditErrorElement.textContent = 'An error occurred gathering product data.';
        productEditErrorElement.style.display = 'block'; return;
    }
    storeProductData(productData); displayProductItem(productData); hideProductForm(); updateSocialProductOptions();
    if (productSubmitErrorElement) productSubmitErrorElement.style.display = 'none';
    console.log("Product saved/updated:", productData.id);
}

/** Called when the cancel button is clicked */
function cancelProductEdit() { hideProductForm(); }

/** Creates or updates a product item displayed in the list */
function displayProductItem(data) {
    if (!productListDiv || !productDisplayTemplate) { return; }
    let itemElement = productListDiv.querySelector(`.product-item[data-product-id="${data.id}"]`);
    if (!itemElement) {
        const displayFragment = productDisplayTemplate.content.cloneNode(true);
        itemElement = displayFragment.querySelector('.product-item');
        if (!itemElement) return;
        itemElement.setAttribute('data-product-id', data.id);
        const removeBtn = itemElement.querySelector('.remove-item-btn');
        removeBtn?.addEventListener('click', removeProduct);
        productListDiv.appendChild(itemElement);
    }
    const displayContentDiv = itemElement.querySelector('.product-display-content');
    const previewImgElement = itemElement.querySelector('.product-preview-img');
    if (displayContentDiv) {
         const formatPrice = (price) => price?.toFixed(2) ?? 'N/A';
         const textContent = (text) => text || 'N/A';
         displayContentDiv.innerHTML = `
            <h4>${textContent(data.productName)} (${textContent(data.brandName)})</h4>
            <p><strong>Category:</strong> ${textContent(data.category)}</p>
            <p><strong>Price:</strong> Reg $${formatPrice(data.regularPrice)} / Sale $${formatPrice(data.salePrice)}
                ${data.discountPercent ? ` <span class="product-tag" style="background-color: #28a745; color: white;">${data.discountPercent} Off</span>` : ''}
            </p>
            ${data.sku ? `<p><strong>SKU:</strong> ${textContent(data.sku)}</p>` : ''}
            ${data.sizeDimensions ? `<p><strong>Size:</strong> ${textContent(data.sizeDimensions)}</p>` : ''}
            ${data.colourFinish ? `<p><strong>Colour:</strong> ${textContent(data.colourFinish)}</p>` : ''}
            ${data.specialFeatures ? `<p><strong>Features:</strong> ${textContent(data.specialFeatures)}</p>` : ''}
            <div> ${data.isMainFlyerProduct ? `<span class="product-tag">Main Flyer</span>` : ''}
                ${data.isBundle ? `<span class="product-tag">Bundle</span> ${data.bundleItems ? `(${textContent(data.bundleItems)})` : ''}`: ''}
                ${data.requestStockImage ? `<span class="product-tag">Request Stock Image</span>` : ''}
            </div>
             ${data.imageFileName ? `<p style="margin-top: 8px;"><small>Image: ${textContent(data.imageFileName)}</small></p>` : ''}
         `;
    }
    if (previewImgElement) {
          if (data.imageDataUrl) { previewImgElement.src = data.imageDataUrl; previewImgElement.alt = data.productName || 'Product Preview'; previewImgElement.style.display = 'block'; }
          else { previewImgElement.style.display = 'none'; previewImgElement.src = ''; previewImgElement.alt = 'Product Preview'; }
    }
}

/** Removes a product item */
function removeProduct(event) {
    const button = event.target;
    const productItem = button.closest('.product-item');
    if (productItem) {
        if (window.confirm('Are you sure you want to remove this product?')) {
            const productIdToRemove = productItem.getAttribute('data-product-id');
            productItem.remove();
            if (productIdToRemove) { removeProductData(productIdToRemove); cleanupSocialMediaOptions(productIdToRemove); }
            updateSocialProductOptions();
             if (productListDiv && productListDiv.querySelectorAll('.product-item').length === 0) { if(productSubmitErrorElement) productSubmitErrorElement.style.display = 'block'; }
             console.log(`Product removed: ${productIdToRemove || 'Unknown ID'}`);
        }
    }
}

// --- Social Media Functions ---

/** Updates product dropdowns in social items */
function updateSocialProductOptions() {
    if (!productListDiv || !socialItemsListDiv) return;
    const productItems = productListDiv.querySelectorAll('.product-item');
    const options = [];
    productItems.forEach(item => {
        const productId = item.getAttribute('data-product-id');
        if (productId) { const data = getProductDataById(productId); if (data) { options.push({ value: data.id, text: `${data.productName} (${data.brandName || 'N/A'})` }); } }
    });
    const socialSelects = socialItemsListDiv.querySelectorAll('.social-product-select');
    socialSelects.forEach(select => {
        const currentValue = select.value;
        while (select.options.length > 1) select.remove(1);
        options.forEach(opt => { const option = document.createElement('option'); option.value = opt.value; option.textContent = opt.text; select.appendChild(option); });
        select.value = options.some(opt => opt.value === currentValue) ? currentValue : "";
    });
    const hasProducts = productItems.length > 0;
    if (addSocialBtn && socialProductError) {
         const currentSocialCount = socialItemsListDiv.querySelectorAll('.social-item').length;
         addSocialBtn.disabled = !hasProducts || (currentSocialCount >= MAX_SOCIAL_ITEMS);
         socialProductError.style.display = hasProducts ? 'none' : 'block';
    }
}

/** Cleans up social options after product removal */
function cleanupSocialMediaOptions(removedProductId) {
     if (!removedProductId || !socialItemsListDiv) return;
     const socialItems = socialItemsListDiv.querySelectorAll('.social-item');
     socialItems.forEach(item => {
         const select = item.querySelector('select[name="socialProductId"]');
         if (select && select.value === removedProductId) { select.value = ""; }
     });
      if (addSocialBtn) {
          const hasProducts = productListDiv?.querySelectorAll('.product-item').length > 0;
          const currentSocialCount = socialItemsListDiv.querySelectorAll('.social-item').length;
          addSocialBtn.disabled = !hasProducts || (currentSocialCount >= MAX_SOCIAL_ITEMS);
      }
      if(socialLimitError) socialLimitError.style.display = 'none';
}

/** Adds a new social media item */
function addSocialItem() {
    if (!socialItemsListDiv || !socialItemTemplate || !productListDiv || !addSocialBtn || !socialLimitError) return;
    const currentSocialItemsCount = socialItemsListDiv.querySelectorAll('.social-item').length;
    const hasProducts = productListDiv.querySelectorAll('.product-item').length > 0;
     if (!hasProducts || currentSocialItemsCount >= MAX_SOCIAL_ITEMS) { socialLimitError.style.display = currentSocialItemsCount >= MAX_SOCIAL_ITEMS ? 'block' : 'none'; return; }
     socialLimitError.style.display = 'none';
    const socialFragment = socialItemTemplate.content.cloneNode(true);
    const socialItemElement = socialFragment.querySelector('.social-item');
    if (!socialItemElement) return;
    const uniqueId = generateUUID(); socialItemElement.setAttribute('data-social-id', uniqueId);
    const removeBtn = socialItemElement.querySelector('.remove-item-btn');
    removeBtn?.addEventListener('click', removeSocialItem);
    socialItemsListDiv.appendChild(socialItemElement);
    updateSocialProductOptions();
    addSocialBtn.disabled = (socialItemsListDiv.querySelectorAll('.social-item').length >= MAX_SOCIAL_ITEMS);
}

/** Removes a social media item */
function removeSocialItem(event) {
      const button = event.target; const socialItem = button.closest('.social-item');
      if (socialItem) {
          socialItem.remove(); if(socialLimitError) socialLimitError.style.display = 'none';
            if (addSocialBtn && productListDiv) {
                const hasProducts = productListDiv.querySelectorAll('.product-item').length > 0;
                const currentSocialCount = socialItemsListDiv?.querySelectorAll('.social-item').length ?? 0;
                addSocialBtn.disabled = !hasProducts || (currentSocialCount >= MAX_SOCIAL_ITEMS);
            } console.log("Social item removed.");
      }
}

// --- Modal Functions ---

/** Displays the success modal */
function showSuccessModal(message) {
    if (modalMessage) { modalMessage.textContent = message; }
    if (successModal) { successModal.classList.add('visible'); }
    else { alert(message + "\n(Check console for details. Modal failed.)"); }
}

/** Hides the success modal */
function closeSuccessModal() { if (successModal) { successModal.classList.remove('visible'); } }


// --- Initialization ---

/** Sets up the form */
function initializeForm() {
    console.log("Initializing form...");
    // Assign references
    storeNameInput = document.getElementById('storeNameInput'); submittedByInput = document.getElementById('submittedByInput');
    submissionDateElement = document.getElementById('submissionDate'); lastUpdatedElement = document.getElementById('lastUpdated');
    approvalStatusSelect = document.getElementById('approvalStatus'); startDateInput = document.getElementById('flyerValidStartDate');
    endDateInput = document.getElementById('flyerValidEndDate'); generalNotesTextarea = document.getElementById('generalNotes');
    productEditArea = document.getElementById('productEditArea'); productFormFieldsContainer = document.getElementById('productFormFieldsContainer');
    productListDiv = document.getElementById('productList'); addProductBtn = document.getElementById('addProductBtn');
    saveProductBtn = document.getElementById('saveProductBtn'); cancelProductBtn = document.getElementById('cancelProductBtn');
    productFormFieldsTemplate = document.getElementById('productFormFieldsTemplate'); productDisplayTemplate = document.getElementById('productDisplayTemplate');
    productSubmitErrorElement = document.getElementById('productSubmitError'); productEditErrorElement = document.getElementById('productEditError');
    socialItemsListDiv = document.getElementById('socialItemsList'); addSocialBtn = document.getElementById('addSocialBtn');
    socialItemTemplate = document.getElementById('socialItemTemplate'); socialMediaSection = document.getElementById('socialMediaSection');
    socialLimitError = document.getElementById('socialLimitError'); socialProductError = document.getElementById('socialProductError');
    reqPriceTagsCheckbox = document.getElementById('reqPriceTags'); reqPostersCheckbox = document.getElementById('reqPosters');
    reqSignageCheckbox = document.getElementById('reqSignage'); printNotesTextarea = document.getElementById('printNotes');
    flyerForm = document.getElementById('flyerForm'); formErrorElement = document.getElementById('formError');
    successModal = document.getElementById('successModal'); modalMessage = document.getElementById('modalMessage');
    modalCloseBtn = document.getElementById('modalCloseBtn');

    // Check essential elements
    const essentialElements = [ flyerForm, addProductBtn, addSocialBtn, successModal, modalCloseBtn, productEditArea, productFormFieldsContainer, productListDiv, saveProductBtn, cancelProductBtn, productFormFieldsTemplate, productDisplayTemplate, socialItemsListDiv, socialItemTemplate ];
    if (essentialElements.some(el => !el)) {
         console.error("Essential form elements not found! Check HTML IDs.", { /* Log details */ });
         document.body.innerHTML = '<p style="color: red; font-weight: bold; padding: 20px;">Error: Could not initialize application components. Check console (F12).</p>'; return;
    }
    // Set initial values
    const now = new Date();
    if (submissionDateElement) submissionDateElement.textContent = formatDateTime(now);
    if (lastUpdatedElement) lastUpdatedElement.textContent = formatDateTime(now);
    if (approvalStatusSelect) approvalStatusSelect.value = "Draft";
    if (productListDiv) productListDiv.innerHTML = ''; if (socialItemsListDiv) socialItemsListDiv.innerHTML = '';
    // Attach listeners
    addProductBtn.addEventListener('click', showProductForm);
    addSocialBtn.addEventListener('click', addSocialItem);
    flyerForm.addEventListener('submit', handleSubmit);
    modalCloseBtn.addEventListener('click', closeSuccessModal);
    successModal.addEventListener('click', (event) => { if (event.target === successModal) { closeSuccessModal(); } });
    updateSocialProductOptions();
    console.log("Form Initialized successfully.");
}

// --- Form Submission Handler ---

/** Handles form submission */
function handleSubmit(event) {
    event.preventDefault(); if (!flyerForm) return;
    console.log("Form submission initiated...");
    if(formErrorElement) { formErrorElement.textContent = ''; formErrorElement.style.display = 'none'; }
    if(productSubmitErrorElement) { productSubmitErrorElement.style.display = 'none'; }
    flyerForm.querySelectorAll('.invalid').forEach(el => el.classList.remove('invalid'));

    let isFormValid = true; let firstInvalidElement = null; const validationErrors = [];
    const mainFormInputs = flyerForm.querySelectorAll('#storeNameInput, #submittedByInput, #flyerValidStartDate, #flyerValidEndDate');
    mainFormInputs.forEach(input => {
        if (!input.checkValidity()) {
            isFormValid = false; input.classList.add('invalid'); if (!firstInvalidElement) firstInvalidElement = input;
            const label = flyerForm.querySelector(`label[for="${input.id}"]`)?.textContent || input.name || input.id;
            validationErrors.push(`${label.replace(':*','')} is required or invalid.`);
        }
    });
    if (startDateInput && endDateInput) {
        const startDate = startDateInput.value; const endDate = endDateInput.value;
        endDateInput.setCustomValidity("");
        if (startDate && endDate && endDate < startDate) {
            isFormValid = false; endDateInput.classList.add('invalid'); endDateInput.setCustomValidity("End Date cannot be before Start Date.");
            if (!firstInvalidElement) firstInvalidElement = endDateInput; validationErrors.push("Flyer End Date cannot be before Start Date.");
        }
    }
    const productElements = productListDiv?.querySelectorAll('.product-item');
    if (!productElements || productElements.length === 0) {
        isFormValid = false; if(productSubmitErrorElement) productSubmitErrorElement.style.display = 'block';
        if (!firstInvalidElement && addProductBtn) firstInvalidElement = addProductBtn; validationErrors.push("At least one product must be added.");
    }
    if (!isFormValid) {
        if(formErrorElement) { formErrorElement.innerHTML = 'Please correct the following issues:<br>' + validationErrors.join('<br>'); formErrorElement.style.display = 'block'; }
        firstInvalidElement?.focus();
        if (endDateInput && !endDateInput.checkValidity() && endDateInput.validationMessage) { endDateInput.reportValidity(); }
        console.error("Form validation failed during submit. Errors:", validationErrors); return;
    }

    console.log("Form validation passed. Gathering data...");
    const products = []; let productGatherError = false;
    productElements.forEach(item => {
        const id = item.getAttribute('data-product-id');
        if (id) { const productData = getProductDataById(id); if(productData) { products.push(productData); } else { console.error(`CRITICAL: No data for product ID: ${id}.`); productGatherError = true; } }
        else { console.error("CRITICAL: Product item missing ID."); productGatherError = true; }
    });
     if (productGatherError) { if(formErrorElement){ formErrorElement.textContent = 'Internal error retrieving product data.'; formErrorElement.style.display = 'block'; } console.error("Submit stopped: product data error."); return; }

    const socialMediaItems = []; const socialElements = socialItemsListDiv?.querySelectorAll('.social-item');
    socialElements?.forEach(item => {
        const id = item.getAttribute('data-social-id') || generateUUID();
        const productIdSelect = item.querySelector('select[name="socialProductId"]');
        const postTypeSelect = item.querySelector('select[name="socialPostType"]');
        const captionInput = item.querySelector('input[name="socialCaption"]');
        if (productIdSelect?.value && postTypeSelect?.value) {
            const selectedOption = productIdSelect.options[productIdSelect.selectedIndex];
            const productNameRef = selectedOption ? selectedOption.text : 'N/A';
            socialMediaItems.push({ id, productId: productIdSelect.value, productName: productNameRef, caption: captionInput?.value.trim() || '', postType: postTypeSelect.value });
         } else if (productIdSelect?.value || postTypeSelect?.value || captionInput?.value.trim()) { console.warn("Skipping incomplete social item:", item); }
     });

    const printRequests = { priceTags: reqPriceTagsCheckbox?.checked || false, posters: reqPostersCheckbox?.checked || false, inStoreSignage: reqSignageCheckbox?.checked || false, notes: printNotesTextarea?.value.trim() || '', };
    const now = new Date();
    const formData = {
        storeName: storeNameInput?.value.trim() || '', submittedBy: submittedByInput?.value.trim() || '',
        storeId: `STORE_${(storeNameInput?.value || 'UNKNOWN').trim().replace(/\s+/g, '_').toUpperCase()}`,
        submissionDate: now.toISOString(), lastUpdated: now.toISOString(), approvalStatus: approvalStatusSelect?.value || 'Draft',
        flyerValidStartDate: startDateInput?.value || '', flyerValidEndDate: endDateInput?.value || '', generalNotes: generalNotesTextarea?.value.trim() || '',
        products: products, socialMediaItems: socialMediaItems, printRequests: printRequests,
    };

    console.log("--- Form Data Ready for Submission (Simulation) ---");
    console.log(JSON.stringify(formData, null, 2));
    showSuccessModal(`Flyer data gathered for store: ${formData.storeName}.`);
    console.log("Form submission simulation complete.");
}

// --- Helper Functions for In-Memory Data Store ---
function storeProductData(data) { if (!data || !data.id) { console.error("Invalid product data:", data); return; }; productDataStore.set(data.id, data); }
function getProductDataById(id) { return productDataStore.get(id); }
function removeProductData(id) { productDataStore.delete(id); }

// --- Global Initialization ---
if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', initializeForm); }
else { initializeForm(); } // Already loaded
document.addEventListener("DOMContentLoaded", () => {
  const flyerForm = document.getElementById("flyerForm");
  const successModal = document.getElementById("successModal");
  const modalCloseBtn = document.getElementById("modalCloseBtn");




