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

    // Clear previous custom validity and discount display
    salePriceInput.setCustomValidity("");
    discountInput.value = '';

    const regularPrice = parseFloat(regularPriceInput.value);
    const salePrice = parseFloat(salePriceInput.value);

    // Check if prices are valid numbers and positive
    if (!isNaN(regularPrice) && !isNaN(salePrice) && regularPrice > 0 && salePrice > 0) {
         // Check if sale price is less than regular price
         if (salePrice < regularPrice) {
             const discount = ((regularPrice - salePrice) / regularPrice) * 100;
             discountInput.value = discount.toFixed(1) + '%';
         } else {
             // Set custom validity if sale price is not lower
             salePriceInput.setCustomValidity("Sale price must be less than regular price.");
         }
    }
}

/** Handles image selection and displays a preview */
function handleImagePreview(event, previewContainer) {
    const input = event.target;
    if (!previewContainer || !input) return;

    // Reset preview area
    previewContainer.innerHTML = '<small>No image selected.</small>';

    if (input.files && input.files[0]) {
        const file = input.files[0];

        // Validate file type
        if (!file.type.startsWith('image/')) {
            previewContainer.innerHTML = '<small style="color: red;">Invalid file type. Please select an image.</small>';
            input.value = ''; // Clear the invalid file selection
            return;
        }

        // Validate file size
        const maxSizeMB = 5;
        const maxSize = maxSizeMB * 1024 * 1024;
        if (file.size > maxSize) {
            previewContainer.innerHTML = `<small style="color: red;">File too large (Max ${maxSizeMB}MB).</small>`;
            input.value = ''; // Clear the invalid file selection
            return;
        }

        // Read and display the image
        const reader = new FileReader();
        reader.onload = function(e) {
            if (!e.target?.result) return; // Check if result exists

            previewContainer.innerHTML = ''; // Clear previous content
            const img = document.createElement('img');
            img.src = e.target.result;
            img.alt = "Image Preview";
            // Basic styling for preview image (adjust as needed)
            img.style.maxWidth = '100px';
            img.style.maxHeight = '100px';
            img.style.marginRight = '10px';
            img.style.verticalAlign = 'middle';

            const fileNameSpan = document.createElement('span');
            fileNameSpan.textContent = ` (${file.name})`;
            fileNameSpan.style.verticalAlign = 'middle';

            previewContainer.appendChild(img);
            previewContainer.appendChild(fileNameSpan);
        }
        reader.onerror = function() {
            console.error("Error reading file:", reader.error);
            previewContainer.innerHTML = '<small style="color: red;">Error reading file.</small>';
            input.value = ''; // Clear the file selection on error
        }
        reader.readAsDataURL(file);
    }
}

/** Shows the product editing form */
function showProductForm() {
    console.log("Showing product form...");
    // Ensure all required elements are available
    if (!productFormFieldsContainer || !productFormFieldsTemplate || !productEditArea || !addProductBtn || !saveProductBtn || !cancelProductBtn || !productEditErrorElement) {
        console.error("ShowProductForm Error: One or more required elements not found!");
        alert("Error: Could not display the product form. Please check console and refresh.");
        return;
    }

    productEditErrorElement.style.display = 'none'; // Hide previous errors
    productFormFieldsContainer.innerHTML = ''; // Clear previous form fields

    // Clone the template content
    const formFieldsFragment = productFormFieldsTemplate.content.cloneNode(true);

    // --- Add Event Listeners to Cloned Elements ---

    // Add listener for price inputs to calculate discount
    const priceInputs = formFieldsFragment.querySelectorAll('.price-input');
    priceInputs.forEach(input => {
        input.addEventListener('input', () => calculateDiscount(productFormFieldsContainer)); // Pass the container
    });

    // Add listener for bundle checkbox
    const bundleCheckbox = formFieldsFragment.querySelector('.bundle-checkbox');
    const bundleItemsDiv = formFieldsFragment.querySelector('.bundle-items-container');
    if (bundleCheckbox && bundleItemsDiv) {
         const bundleTextarea = bundleItemsDiv.querySelector('textarea[name="bundleItems"]');
         bundleCheckbox.addEventListener('change', (e) => {
             const isChecked = e.target.checked;
             bundleItemsDiv.style.display = isChecked ? 'block' : 'none';
             if(bundleTextarea) bundleTextarea.required = isChecked; // Set required based on checkbox
         });
         // Initial state based on default checked status
         bundleItemsDiv.style.display = bundleCheckbox.checked ? 'block' : 'none';
         if(bundleTextarea) bundleTextarea.required = bundleCheckbox.checked;
    }

    // Add listener for image input
    const imageInput = formFieldsFragment.querySelector('.product-image-input');
    const previewDiv = formFieldsFragment.querySelector('.image-preview');
    if (imageInput && previewDiv) {
        imageInput.addEventListener('change', (event) => handleImagePreview(event, previewDiv));
    }

    // Append the new form fields
    productFormFieldsContainer.appendChild(formFieldsFragment);

    // Show/hide relevant buttons and areas
    productEditArea.style.display = 'block';
    addProductBtn.style.display = 'none';

    // Ensure listeners are correctly attached (remove old ones first if necessary)
    saveProductBtn.removeEventListener('click', saveProduct);
    cancelProductBtn.removeEventListener('click', cancelProductEdit);
    saveProductBtn.addEventListener('click', saveProduct);
    cancelProductBtn.addEventListener('click', cancelProductEdit);

    // Focus the first input element for better UX
    const firstInput = productFormFieldsContainer.querySelector('input, select, textarea');
    firstInput?.focus();

    console.log("Product form shown successfully.");
}

/** Hides the product editing form */
function hideProductForm() {
    console.log("Hiding product form...");
     if (productFormFieldsContainer) {
         productFormFieldsContainer.innerHTML = ''; // Clear the form fields
     }
     if(productEditArea) productEditArea.style.display = 'none';
     if(addProductBtn) addProductBtn.style.display = 'inline-block'; // Show the 'Add Product' button again
     currentEditProductId = null; // Reset editing state
}

/** Validates and saves product data (to in-memory store) */
function saveProduct() {
    console.log("Save product button clicked.");
    if (!productFormFieldsContainer || !productEditErrorElement) {
        console.error("SaveProduct Error: Form container or error element not found.");
        return;
    }
    productEditErrorElement.style.display = 'none'; // Hide previous errors
    let isValid = true;
    let firstInvalidElement = null;

    // Clear previous invalid styling
    productFormFieldsContainer.querySelectorAll('.invalid').forEach(el => el.classList.remove('invalid'));

    // --- Validation ---
    // Check standard required fields
    const inputsToCheck = productFormFieldsContainer.querySelectorAll('input[required]:not([type="checkbox"]), select[required], textarea[required]');
    inputsToCheck.forEach(input => {
        if (!input.checkValidity()) {
            isValid = false;
            input.classList.add('invalid');
            if (!firstInvalidElement) firstInvalidElement = input; // Track first invalid element for focus
        }
    });

    // Validate sale price (custom logic)
    const salePriceInput = productFormFieldsContainer.querySelector('input[name="salePrice"]');
    if(salePriceInput) {
        calculateDiscount(productFormFieldsContainer); // Recalculate discount and check validity
        if (!salePriceInput.checkValidity()) {
            isValid = false;
            salePriceInput.classList.add('invalid');
            if (!firstInvalidElement) firstInvalidElement = salePriceInput;
        }
    } else {
        console.warn("Sale price input not found during save.");
        isValid = false; // Consider this invalid if the input is missing
    }


    // Validate bundle items textarea if bundle checkbox is checked
    const bundleCheckbox = productFormFieldsContainer.querySelector('.bundle-checkbox');
    const bundleTextarea = productFormFieldsContainer.querySelector('textarea[name="bundleItems"]');
    if (bundleCheckbox?.checked && bundleTextarea) {
        if (!bundleTextarea.checkValidity()) { // Check validity only if required (checked)
            isValid = false;
            bundleTextarea.classList.add('invalid');
            if (!firstInvalidElement) firstInvalidElement = bundleTextarea;
        }
    }

    // If validation fails, show error and focus first invalid field
    if (!isValid) {
        productEditErrorElement.textContent = 'Please correct the highlighted fields.';
        productEditErrorElement.style.display = 'block';
        firstInvalidElement?.focus();
        console.log("Validation failed in saveProduct.");
        return;
    }

    // --- Data Gathering ---
    const uniqueId = currentEditProductId || generateUUID(); // Use existing ID if editing, else generate new
    const productData = { id: uniqueId };

    try {
        // Gather data from form fields
        productData.productName = productFormFieldsContainer.querySelector('input[name="productName"]').value.trim();
        productData.brandName = productFormFieldsContainer.querySelector('input[name="brandName"]').value.trim();
        productData.category = productFormFieldsContainer.querySelector('select[name="category"]').value;
        productData.sizeDimensions = productFormFieldsContainer.querySelector('input[name="sizeDimensions"]').value.trim();
        productData.colourFinish = productFormFieldsContainer.querySelector('input[name="colourFinish"]').value.trim();
        productData.sku = productFormFieldsContainer.querySelector('input[name="sku"]').value.trim();
        productData.regularPrice = parseFloat(productFormFieldsContainer.querySelector('input[name="regularPrice"]').value);
        productData.salePrice = parseFloat(productFormFieldsContainer.querySelector('input[name="salePrice"]').value);
        productData.discountPercent = productFormFieldsContainer.querySelector('input.discount-display').value; // Get calculated discount
        productData.isMainFlyerProduct = productFormFieldsContainer.querySelector('input[name="isMainFlyerProduct"]').checked;
        productData.isBundle = productFormFieldsContainer.querySelector('input[name="isBundle"]').checked;
        productData.bundleItems = productFormFieldsContainer.querySelector('textarea[name="bundleItems"]').value.trim();
        productData.requestStockImage = productFormFieldsContainer.querySelector('input[name="requestStockImage"]').checked;

        // Handle image data
        const imageInput = productFormFieldsContainer.querySelector('.product-image-input');
        const previewImg = productFormFieldsContainer.querySelector('.image-preview img');

        if (imageInput?.files && imageInput.files[0]) {
            // New image selected
            const file = imageInput.files[0];
            productData.imageFileName = file.name;
            // Store the Data URL from the preview if available
            if(previewImg && previewImg.src.startsWith('data:image')) {
                productData.imageDataUrl = previewImg.src;
            }
        } else if (currentEditProductId) {
            // No new image, keep existing if editing
            const existingData = getProductDataById(currentEditProductId);
            if (existingData) {
                productData.imageFileName = existingData.imageFileName;
                productData.imageDataUrl = existingData.imageDataUrl;
            }
        }
        // Clear bundle items if not a bundle
        if (!productData.isBundle) {
            productData.bundleItems = undefined; // Or set to empty string if preferred
        }

    } catch (error) {
        console.error("Error gathering product data:", error);
        productEditErrorElement.textContent = 'An error occurred gathering product data. Check console.';
        productEditErrorElement.style.display = 'block';
        return;
    }

    // --- Store, Display, and Cleanup ---
    storeProductData(productData); // Save to in-memory store
    displayProductItem(productData); // Update or add to the displayed list
    hideProductForm(); // Hide the editing form
    updateSocialProductOptions(); // Update dropdowns in social media section

    // Hide the main form's product requirement error if it was visible
    if (productSubmitErrorElement) productSubmitErrorElement.style.display = 'none';

    console.log("Product saved/updated:", productData.id);
}

/** Called when the cancel button in the product edit area is clicked */
function cancelProductEdit() {
    hideProductForm();
}

/** Creates or updates a product item displayed in the main list */
function displayProductItem(data) {
    if (!productListDiv || !productDisplayTemplate) {
        console.error("DisplayProductItem Error: List container or template not found.");
        return;
    }

    // Find existing item or create new one
    let itemElement = productListDiv.querySelector(`.product-item[data-product-id="${data.id}"]`);

    if (!itemElement) {
        // Create new item from template
        const displayFragment = productDisplayTemplate.content.cloneNode(true);
        itemElement = displayFragment.querySelector('.product-item');
        if (!itemElement) {
            console.error("Could not find .product-item in display template.");
            return;
        }
        itemElement.setAttribute('data-product-id', data.id);

        // Add event listener for removal
        const removeBtn = itemElement.querySelector('.remove-item-btn');
        removeBtn?.addEventListener('click', removeProduct);

        productListDiv.appendChild(itemElement); // Add to the list
    }

    // --- Populate the item with data ---
    const displayContentDiv = itemElement.querySelector('.product-display-content');
    const previewImgElement = itemElement.querySelector('.product-preview-img'); // Image element in the display

    if (displayContentDiv) {
         // Helper functions for safe display
         const formatPrice = (price) => price?.toFixed(2) ?? 'N/A';
         const textContent = (text) => text || 'N/A'; // Handle empty/null values

         // Use template literals for cleaner HTML structure
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
             <div>
                 ${data.isMainFlyerProduct ? `<span class="product-tag">Main Flyer</span>` : ''}
                 ${data.isBundle ? `<span class="product-tag">Bundle</span> ${data.bundleItems ? `(${textContent(data.bundleItems)})` : ''}`: ''}
                 ${data.requestStockImage ? `<span class="product-tag">Request Stock Image</span>` : ''}
             </div>
              ${data.imageFileName ? `<p style="margin-top: 8px;"><small>Image: ${textContent(data.imageFileName)}</small></p>` : ''}
         `;
    } else {
        console.warn("'.product-display-content' div not found in product item:", itemElement);
    }

    // Update the preview image in the display list
    if (previewImgElement) {
         if (data.imageDataUrl) {
             previewImgElement.src = data.imageDataUrl;
             previewImgElement.alt = data.productName || 'Product Preview';
             previewImgElement.style.display = 'block'; // Show image
         } else {
             previewImgElement.style.display = 'none'; // Hide if no image URL
             previewImgElement.src = ''; // Clear src
             previewImgElement.alt = 'Product Preview';
         }
    } else {
         console.warn("'.product-preview-img' not found in product item:", itemElement);
    }
}


/** Removes a product item from the list and the data store */
function removeProduct(event) {
    const button = event.target;
    const productItem = button.closest('.product-item'); // Find the parent product item

    if (productItem) {
        // Confirmation dialog
        if (window.confirm('Are you sure you want to remove this product?')) {
            const productIdToRemove = productItem.getAttribute('data-product-id');

            // Remove the element from the DOM
            productItem.remove();

            // Remove data from the store and update dependent UI
            if (productIdToRemove) {
                removeProductData(productIdToRemove); // Remove from Map
                cleanupSocialMediaOptions(productIdToRemove); // Update social dropdowns
            }
            updateSocialProductOptions(); // General update for social section state

             // Show error if no products are left (relevant for form submission)
             if (productListDiv && productListDiv.querySelectorAll('.product-item').length === 0) {
                 if(productSubmitErrorElement) productSubmitErrorElement.style.display = 'block';
             }

             console.log(`Product removed: ${productIdToRemove || 'Unknown ID'}`);
        }
    }
}

// --- Social Media Functions ---

/** Updates product dropdowns in all existing social media items */
function updateSocialProductOptions() {
    if (!productListDiv || !socialItemsListDiv) return;

    const productItems = productListDiv.querySelectorAll('.product-item');
    const options = [];

    // Build the list of available products for dropdowns
    productItems.forEach(item => {
        const productId = item.getAttribute('data-product-id');
        if (productId) {
            const data = getProductDataById(productId);
            if (data) {
                // Create option data { value: id, text: 'ProductName (Brand)' }
                options.push({ value: data.id, text: `${data.productName} (${data.brandName || 'N/A'})` });
            }
        }
    });

    // Update each social item's product select dropdown
    const socialSelects = socialItemsListDiv.querySelectorAll('.social-product-select');
    socialSelects.forEach(select => {
        const currentValue = select.value; // Store the currently selected value

        // Clear existing options (except the default placeholder)
        while (select.options.length > 1) {
            select.remove(1);
        }

        // Add new options based on current products
        options.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.value;
            option.textContent = opt.text;
            select.appendChild(option);
        });

        // Try to restore the previously selected value, if it still exists
        select.value = options.some(opt => opt.value === currentValue) ? currentValue : ""; // Reset if product removed
    });

    // Enable/disable the 'Add Social Item' button based on product availability and count limit
    const hasProducts = productItems.length > 0;
    if (addSocialBtn && socialProductError) {
         const currentSocialCount = socialItemsListDiv.querySelectorAll('.social-item').length;
         addSocialBtn.disabled = !hasProducts || (currentSocialCount >= MAX_SOCIAL_ITEMS);
         // Show/hide error message if no products are available to link
         socialProductError.style.display = hasProducts ? 'none' : 'block';
    }
}

/** Resets social media dropdowns if the linked product was removed */
function cleanupSocialMediaOptions(removedProductId) {
     if (!removedProductId || !socialItemsListDiv) return;

     const socialItems = socialItemsListDiv.querySelectorAll('.social-item');
     socialItems.forEach(item => {
         const select = item.querySelector('select[name="socialProductId"]');
         // If a social item was linked to the removed product, reset its selection
         if (select && select.value === removedProductId) {
             select.value = ""; // Reset to default/placeholder option
         }
     });

      // Re-evaluate the state of the 'Add Social' button
      if (addSocialBtn) {
          const hasProducts = productListDiv?.querySelectorAll('.product-item').length > 0;
          const currentSocialCount = socialItemsListDiv.querySelectorAll('.social-item').length;
          addSocialBtn.disabled = !hasProducts || (currentSocialCount >= MAX_SOCIAL_ITEMS);
      }
      // Hide limit error if it was visible (removing an item might make space)
      if(socialLimitError) socialLimitError.style.display = 'none';
}

/** Adds a new social media item form section */
function addSocialItem() {
    if (!socialItemsListDiv || !socialItemTemplate || !productListDiv || !addSocialBtn || !socialLimitError) {
         console.error("AddSocialItem Error: Required elements missing.");
         return;
    }

    const currentSocialItemsCount = socialItemsListDiv.querySelectorAll('.social-item').length;
    const hasProducts = productListDiv.querySelectorAll('.product-item').length > 0;

     // Prevent adding if no products exist or if the limit is reached
     if (!hasProducts || currentSocialItemsCount >= MAX_SOCIAL_ITEMS) {
         socialLimitError.style.display = currentSocialItemsCount >= MAX_SOCIAL_ITEMS ? 'block' : 'none';
         if (!hasProducts) console.warn("Cannot add social item: No products added yet.");
         return;
     }

     socialLimitError.style.display = 'none'; // Hide limit error if we are adding

    // Clone the template for a new social item
    const socialFragment = socialItemTemplate.content.cloneNode(true);
    const socialItemElement = socialFragment.querySelector('.social-item');
    if (!socialItemElement) {
        console.error("Could not find .social-item in social template.");
        return;
    }

    // Assign a unique ID for potential future reference (though not used in submission currently)
    const uniqueId = generateUUID();
    socialItemElement.setAttribute('data-social-id', uniqueId);

    // Add event listener to the remove button within the new item
    const removeBtn = socialItemElement.querySelector('.remove-item-btn');
    removeBtn?.addEventListener('click', removeSocialItem);

    // Append the new item to the list
    socialItemsListDiv.appendChild(socialItemElement);

    // Populate the product dropdown in the newly added item
    updateSocialProductOptions();

    // Disable the 'Add' button if the limit is now reached
    addSocialBtn.disabled = (socialItemsListDiv.querySelectorAll('.social-item').length >= MAX_SOCIAL_ITEMS);
}

/** Removes a specific social media item section */
function removeSocialItem(event) {
      const button = event.target;
      const socialItem = button.closest('.social-item'); // Find the parent social item

      if (socialItem) {
          socialItem.remove(); // Remove from DOM
          if(socialLimitError) socialLimitError.style.display = 'none'; // Hide limit error

           // Re-enable the 'Add Social Item' button if we are now below the limit
           if (addSocialBtn && productListDiv) {
               const hasProducts = productListDiv.querySelectorAll('.product-item').length > 0;
               const currentSocialCount = socialItemsListDiv?.querySelectorAll('.social-item').length ?? 0;
               addSocialBtn.disabled = !hasProducts || (currentSocialCount >= MAX_SOCIAL_ITEMS);
           }
           console.log("Social item removed.");
      }
}

// --- Modal Functions ---

/** Displays the success modal with a specific message */
function showSuccessModal(message) {
    if (modalMessage) {
        modalMessage.textContent = message; // Set the message content
    }
    if (successModal) {
        successModal.classList.add('visible'); // Make the modal visible (CSS handles display)
    } else {
        // Fallback if modal element isn't found (shouldn't happen with checks)
        console.error("Success modal element not found!");
        alert(message + "\n(Modal display failed - check console.)");
    }
}

/** Hides the success modal */
function closeSuccessModal() {
    if (successModal) {
        successModal.classList.remove('visible'); // Hide the modal
    }
}


// --- Initialization ---

/** Sets up the form, gets element references, and attaches initial listeners */
function initializeForm() {
    console.log("Initializing form...");

    // --- Assign DOM Element References ---
    // Use try-catch or check existence for robustness if needed, but direct assignment is common
    storeNameInput = document.getElementById('storeNameInput');
    submittedByInput = document.getElementById('submittedByInput');
    submissionDateElement = document.getElementById('submissionDate');
    lastUpdatedElement = document.getElementById('lastUpdated');
    approvalStatusSelect = document.getElementById('approvalStatus');
    startDateInput = document.getElementById('flyerValidStartDate');
    endDateInput = document.getElementById('flyerValidEndDate');
    generalNotesTextarea = document.getElementById('generalNotes');
    productEditArea = document.getElementById('productEditArea');
    productFormFieldsContainer = document.getElementById('productFormFieldsContainer');
    productListDiv = document.getElementById('productList');
    addProductBtn = document.getElementById('addProductBtn');
    saveProductBtn = document.getElementById('saveProductBtn');
    cancelProductBtn = document.getElementById('cancelProductBtn');
    productFormFieldsTemplate = document.getElementById('productFormFieldsTemplate');
    productDisplayTemplate = document.getElementById('productDisplayTemplate');
    productSubmitErrorElement = document.getElementById('productSubmitError');
    productEditErrorElement = document.getElementById('productEditError');
    socialItemsListDiv = document.getElementById('socialItemsList');
    addSocialBtn = document.getElementById('addSocialBtn');
    socialItemTemplate = document.getElementById('socialItemTemplate');
    socialMediaSection = document.getElementById('socialMediaSection');
    socialLimitError = document.getElementById('socialLimitError');
    socialProductError = document.getElementById('socialProductError');
    reqPriceTagsCheckbox = document.getElementById('reqPriceTags');
    reqPostersCheckbox = document.getElementById('reqPosters');
    reqSignageCheckbox = document.getElementById('reqSignage');
    printNotesTextarea = document.getElementById('printNotes');
    flyerForm = document.getElementById('flyerForm');
    formErrorElement = document.getElementById('formError');
    successModal = document.getElementById('successModal');
    modalMessage = document.getElementById('modalMessage');
    modalCloseBtn = document.getElementById('modalCloseBtn');

    // --- Check for Essential Elements ---
    // Verify that critical elements needed for core functionality exist
    const essentialElements = [
        flyerForm, addProductBtn, addSocialBtn, successModal, modalCloseBtn,
        productEditArea, productFormFieldsContainer, productListDiv,
        saveProductBtn, cancelProductBtn, productFormFieldsTemplate,
        productDisplayTemplate, socialItemsListDiv, socialItemTemplate
    ];
    if (essentialElements.some(el => !el)) {
         console.error("CRITICAL ERROR: Essential form elements not found! Check HTML IDs match the script.", {
             missing: essentialElements.map((el, i) => el ? null : i).filter(x => x !== null) // Log indices of missing elements for easier debug
         });
         // Display a user-friendly error message if the app can't initialize
         document.body.innerHTML = '<p style="color: red; font-weight: bold; padding: 20px;">Error: Application components failed to load. Please check the browser console (F12) for details and contact support if the issue persists.</p>';
         return; // Stop initialization
    }

    // --- Set Initial Values ---
    const now = new Date();
    if (submissionDateElement) submissionDateElement.textContent = formatDateTime(now);
    if (lastUpdatedElement) lastUpdatedElement.textContent = formatDateTime(now);
    if (approvalStatusSelect) approvalStatusSelect.value = "Draft"; // Default status
    if (productListDiv) productListDiv.innerHTML = ''; // Clear any placeholder content
    if (socialItemsListDiv) socialItemsListDiv.innerHTML = ''; // Clear any placeholder content

    // --- Attach Event Listeners ---
    addProductBtn.addEventListener('click', showProductForm);
    addSocialBtn.addEventListener('click', addSocialItem);
    flyerForm.addEventListener('submit', handleSubmit); // Main form submission
    modalCloseBtn.addEventListener('click', closeSuccessModal); // Modal close button
    // Allow closing modal by clicking outside the content area
    successModal.addEventListener('click', (event) => {
        if (event.target === successModal) { // Check if click was on the background overlay
            closeSuccessModal();
        }
    });

    // Initial setup for the social media section state
    updateSocialProductOptions();

    console.log("Form Initialized successfully.");
}

// --- Form Submission Handler ---

/** Handles the main form submission */
function handleSubmit(event) {
    event.preventDefault(); // Prevent default browser form submission
    if (!flyerForm) return;
    console.log("Form submission initiated...");

    // --- Reset Previous Errors ---
    if(formErrorElement) {
        formErrorElement.textContent = '';
        formErrorElement.style.display = 'none';
    }
    if(productSubmitErrorElement) { // Hide the "at least one product" error
        productSubmitErrorElement.style.display = 'none';
    }
    // Clear invalid styling from all form elements
    flyerForm.querySelectorAll('.invalid').forEach(el => el.classList.remove('invalid'));

    // --- Validation ---
    let isFormValid = true;
    let firstInvalidElement = null;
    const validationErrors = []; // Collect user-friendly error messages

    // Validate main form fields
    const mainFormInputs = flyerForm.querySelectorAll(
        // Select required inputs/selects in the main form area
        '#storeNameInput, #submittedByInput, #flyerValidStartDate, #flyerValidEndDate'
    );
    mainFormInputs.forEach(input => {
        if (!input.checkValidity()) {
            isFormValid = false;
            input.classList.add('invalid');
            if (!firstInvalidElement) firstInvalidElement = input;
            // Get label text for error message
            const label = flyerForm.querySelector(`label[for="${input.id}"]`)?.textContent || input.name || input.id;
            validationErrors.push(`${label.replace(':*','').trim()} is required or invalid.`);
        }
    });

    // Validate date range
    if (startDateInput && endDateInput) {
        const startDate = startDateInput.value;
        const endDate = endDateInput.value;
        endDateInput.setCustomValidity(""); // Clear previous custom validity
        if (startDate && endDate && endDate < startDate) {
            isFormValid = false;
            endDateInput.classList.add('invalid');
            endDateInput.setCustomValidity("End Date cannot be before Start Date."); // Set message for browser tooltip
            if (!firstInvalidElement) firstInvalidElement = endDateInput;
            validationErrors.push("Flyer End Date cannot be before Start Date.");
        }
    }

    // Validate product list - ensure at least one product is added
    const productElements = productListDiv?.querySelectorAll('.product-item');
    if (!productElements || productElements.length === 0) {
        isFormValid = false;
        if(productSubmitErrorElement) productSubmitErrorElement.style.display = 'block'; // Show specific error message
        if (!firstInvalidElement && addProductBtn) firstInvalidElement = addProductBtn; // Focus 'Add Product' if no other errors
        validationErrors.push("At least one product must be added to the flyer.");
    }

    // --- Handle Validation Failure ---
    if (!isFormValid) {
        if(formErrorElement) {
            // Display collected error messages
            formErrorElement.innerHTML = 'Please correct the following issues:<br>' + validationErrors.join('<br>');
            formErrorElement.style.display = 'block';
        }
        firstInvalidElement?.focus(); // Focus the first invalid element

        // Explicitly report validity for elements with custom messages (like date range)
        if (endDateInput && !endDateInput.checkValidity() && endDateInput.validationMessage) {
            endDateInput.reportValidity();
        }

        console.error("Form validation failed during submit. Errors:", validationErrors);
        return; // Stop submission
    }

    // --- Validation Passed - Gather Data ---
    console.log("Form validation passed. Gathering data...");

    // Gather Product Data from the store
    const products = [];
    let productGatherError = false;
    productElements.forEach(item => {
        const id = item.getAttribute('data-product-id');
        if (id) {
            const productData = getProductDataById(id);
            if(productData) {
                products.push(productData);
            } else {
                // This indicates an internal inconsistency - data missing from store
                console.error(`CRITICAL: No data found in store for product ID: ${id}. Submission aborted.`);
                productGatherError = true;
            }
        } else {
            console.error("CRITICAL: Product item found in list is missing its data-product-id attribute.");
            productGatherError = true;
        }
    });

     if (productGatherError) {
         if(formErrorElement){
             formErrorElement.textContent = 'Internal error: Could not retrieve all product data. Please try adding products again or refresh.';
             formErrorElement.style.display = 'block';
         }
         console.error("Submit stopped due to critical product data gathering error.");
         return;
     }


    // Gather Social Media Data
    const socialMediaItems = [];
    const socialElements = socialItemsListDiv?.querySelectorAll('.social-item');
    socialElements?.forEach(item => {
        const id = item.getAttribute('data-social-id') || generateUUID(); // Use existing or generate new ID
        const productIdSelect = item.querySelector('select[name="socialProductId"]');
        const postTypeSelect = item.querySelector('select[name="socialPostType"]');
        const captionInput = item.querySelector('input[name="socialCaption"]');

        // Only include social items where both product and post type are selected
        if (productIdSelect?.value && postTypeSelect?.value) {
             // Get the product name text from the selected option for reference
             const selectedOption = productIdSelect.options[productIdSelect.selectedIndex];
             const productNameRef = selectedOption ? selectedOption.text : 'N/A'; // Fallback text

             socialMediaItems.push({
                 id: id, // Unique ID for the social item itself
                 productId: productIdSelect.value, // ID of the linked product
                 productName: productNameRef, // Name of the linked product (for display/reference)
                 caption: captionInput?.value.trim() || '', // Caption text
                 postType: postTypeSelect.value // e.g., 'Facebook', 'Instagram'
             });
         } else if (productIdSelect?.value || postTypeSelect?.value || captionInput?.value.trim()) {
             // Warn if an item seems partially filled but is being skipped
             console.warn("Skipping incomplete social item (missing product or post type):", item);
         }
     });

    // Gather Print Request Data
    const printRequests = {
        priceTags: reqPriceTagsCheckbox?.checked || false,
        posters: reqPostersCheckbox?.checked || false,
        inStoreSignage: reqSignageCheckbox?.checked || false,
        notes: printNotesTextarea?.value.trim() || '',
    };

    // --- Assemble Final Form Data Object ---
    const now = new Date(); // Use consistent timestamp for submission/update
    const formData = {
        // Main form info
        storeName: storeNameInput?.value.trim() || '',
        submittedBy: submittedByInput?.value.trim() || '',
        storeId: `STORE_${(storeNameInput?.value || 'UNKNOWN').trim().replace(/\s+/g, '_').toUpperCase()}`, // Example generated ID
        submissionDate: now.toISOString(), // ISO format for consistency
        lastUpdated: now.toISOString(),
        approvalStatus: approvalStatusSelect?.value || 'Draft',
        flyerValidStartDate: startDateInput?.value || '',
        flyerValidEndDate: endDateInput?.value || '',
        generalNotes: generalNotesTextarea?.value.trim() || '',
        // Collected data arrays/objects
        products: products,
        socialMediaItems: socialMediaItems,
        printRequests: printRequests,
    };

    // --- Simulate Submission (e.g., log to console, show success) ---
    console.log("--- Form Data Ready for Submission (Simulation) ---");
    console.log(JSON.stringify(formData, null, 2)); // Pretty-print JSON for review

    // *** Show the success modal ***
    showSuccessModal(`Flyer data gathered successfully for store: ${formData.storeName}. Check console for details.`);

    // Optionally, reset the form after successful "submission"
    // resetForm(); // You would need to implement a resetForm function if desired

    console.log("Form submission simulation complete.");
}

// --- Helper Functions for In-Memory Data Store ---

/** Stores or updates product data in the Map */
function storeProductData(data) {
    if (!data || !data.id) {
        console.error("Attempted to store invalid product data:", data);
        return;
    };
    productDataStore.set(data.id, data);
}

/** Retrieves product data by ID from the Map */
function getProductDataById(id) {
    return productDataStore.get(id);
}

/** Removes product data by ID from the Map */
function removeProductData(id) {
    productDataStore.delete(id);
}

// --- Global Initialization ---
// Ensures the DOM is fully loaded before running initialization code
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeForm);
} else {
    initializeForm(); // DOM was already loaded
}

// Example of how the second DOMContentLoaded listener might be simplified or integrated
// The initializeForm function already handles getting references and setting up listeners.
// This second listener seems redundant if initializeForm covers everything.
/*
document.addEventListener("DOMContentLoaded", () => {
  // If initializeForm already handles flyerForm, successModal, modalCloseBtn,
  // this specific listener might not be needed unless it does something unique.
  // const flyerForm = document.getElementById("flyerForm");
  // const successModal = document.getElementById("successModal");
  // const modalCloseBtn = document.getElementById("modalCloseBtn");
  // Ensure initializeForm is called only once. The check above handles this.
  console.log("Second DOMContentLoaded listener fired."); // For debugging if needed
});
*/
