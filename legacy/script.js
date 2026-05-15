document.addEventListener('DOMContentLoaded', () => {
    console.log("Flyer Submission UI & Admin Script Loaded. DOM ready. V2.4 (All Fixes & Stepper Enhancements)");

    // --- Constants ---
    const FLYER_PRODUCTION_DAYS = 14;
    const PAGE_1_MAX_SLOTS = 8;
    const ERROR_BORDER_CLASS = 'border-brand-red';
    const PRODUCT_CARD_ACTIONS_MENU_RIGHT_OFFSET_CLASS = 'left-43';
    const PAGE_DEFAULT_MAX_SLOTS = 16;
    const IMAGE_MAX_FILE_SIZE_MB = 5;
    const SVG_NS = "http://www.w3.org/2000/svg";
    const ESCAPE_HTML_MAP = {
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    };
    const MAX_SOCIAL_PRODUCTS = 7;
    const ACTIVE_SECTION_HIGHLIGHT_CLASSES = ['ring-2', 'ring-brand-blue', 'ring-offset-2', 'shadow-lg', 'rounded-2xl'];

    // --- Flyer UI DOM Element Caching ---
    const stepperNav = document.querySelector('nav[aria-label="Progress"]');
    const stepElements = {
        'store-info': document.getElementById('step-store-info'),
        'add-products': document.getElementById('step-add-products'),
        'social-print': document.getElementById('step-social-print'),
        'review': document.getElementById('step-review')
    };

    const mainLayoutColumns = document.getElementById('mainLayoutColumns');
    const reviewSection = document.getElementById('reviewSection');
    const flyerSubmissionFormContainer = document.getElementById('flyerSubmissionFormContainer');

    const storeInfoSectionWrapper = document.getElementById('storeInfoForm')?.closest('aside');
    const addProductsSectionWrapper = document.getElementById('productGridArea')?.closest('main');
    const socialPrintSectionWrapper = document.getElementById('socialMediaCard')?.closest('aside');

    const storeInfoForm = document.getElementById('storeInfoForm');
    const storeNameInput = document.getElementById('storeName');
    const submittedByInput = document.getElementById('submittedBy');
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    const notesTextarea = document.getElementById('notes');
    const toggleCanadaPostFlyer = document.getElementById('toggleCanadaPostFlyer');
    const toggleDigitalFlyer = document.getElementById('toggleDigitalFlyer');
    const nextStepStoreInfoBtn = document.getElementById('nextStepStoreInfoBtn');

    const deadlineDateDisplayEl = document.getElementById('flyer-deadline-date-display');
    const countdownTimerDisplayEl = document.getElementById('countdown-timer-display');

    const pageTabsContainer = document.getElementById('pageTabsContainer');
    const productGridArea = document.getElementById('productGridArea');
    const addPageToolbarBtn = document.getElementById('addPageToolbarBtn');
    const removePageToolbarBtn = document.getElementById('removePageToolbarBtn');
    const nextStepAddProductsBtn = document.getElementById('nextStepAddProductsBtn');

    const editProductDrawer = document.getElementById('editProductDrawer');
    const productEditForm = document.getElementById('productEditForm');
    const drawerTitleElement = document.getElementById('drawerTitle');
    const closeDrawerBtn = document.getElementById('closeDrawerBtn');
    const cancelDrawerBtn = document.getElementById('cancelDrawerBtn');
    const saveDrawerBtn = document.getElementById('saveDrawerBtn');
    const drawerProductNameInput = document.getElementById('drawerProductName');
    const drawerBrandNameInput = document.getElementById('drawerBrandName');
    const drawerSkuInput = document.getElementById('drawerSku');
    const drawerCategorySelect = document.getElementById('drawerCategory');
    const drawerProductImageInput = document.getElementById('drawerProductImage');
    const drawerImagePreview = document.getElementById('drawerImagePreview');
    const drawerDescriptionTextarea = document.getElementById('drawerDescription');
    const drawerSizeDimensionsInput = document.getElementById('drawerSizeDimensions');
    const drawerColourFinishInput = document.getElementById('drawerColourFinish');
    const drawerRegularPriceInput = document.getElementById('drawerRegularPrice');
    const drawerSalePriceInput = document.getElementById('drawerSalePrice');
    const drawerDiscountPercentInput = document.getElementById('drawerDiscountPercent');
    const drawerManualDiscountField = document.getElementById('drawerManualDiscountField');
    const drawerManualDiscountDescriptionInput = document.getElementById('drawerManualDiscountDescription');
    const drawerIsMainFlyerProductCheckbox = document.getElementById('drawerIsMainFlyerProduct');
    const drawerIsBundleCheckbox = document.getElementById('drawerIsBundleCheckbox');
    const drawerBundleItemsContainer = document.getElementById('drawerBundleItemsContainer');
    const drawerBundleItemsTextarea = document.getElementById('drawerBundleItems');
    const drawerRequestStockImageCheckbox = document.getElementById('drawerRequestStockImage');
    const drawerIncludeInSocialCheckbox = document.getElementById('drawerIncludeInSocial');
    const drawerErrorMessage = document.getElementById('drawerErrorMessage');

    const socialCounterDisplay = document.getElementById('socialCounterDisplay');
    const socialEligibleProductsList = document.getElementById('socialEligibleProductsList');
    const socialSelectedBadgesContainer = document.getElementById('socialSelectedBadges');
    const reqPriceTagsCheckbox = document.getElementById('reqPriceTags');
    const reqPostersCheckbox = document.getElementById('reqPosters');
    const reqBannersCheckbox = document.getElementById('reqBanners');
    const printNotesTextarea = document.getElementById('printNotes');
    const maxSocialProductsDisplay = document.getElementById('maxSocialProductsDisplay');

    const reviewSubmitBtn = document.getElementById('reviewSubmitBtn');
    const reviewStoreName = document.getElementById('reviewStoreName');
    const reviewSubmittedBy = document.getElementById('reviewSubmittedBy');
    const reviewStartDate = document.getElementById('reviewStartDate');
    const reviewEndDate = document.getElementById('reviewEndDate');
    const reviewNotes = document.getElementById('reviewNotes');
    const reviewCanadaPostFlyer = document.getElementById('reviewCanadaPostFlyer');
    const reviewDigitalFlyer = document.getElementById('reviewDigitalFlyer');

    const reviewProductPagesContainer = document.getElementById('reviewProductPagesContainer');
    const reviewSocialMediaList = document.getElementById('reviewSocialMediaList');
    const reviewReqPriceTags = document.getElementById('reviewReqPriceTags');
    const reviewReqPosters = document.getElementById('reviewReqPosters');
    const reviewReqBanners = document.getElementById('reviewReqBanners');
    const reviewPrintNotes = document.getElementById('reviewPrintNotes');
    const editSubmissionBtn = document.getElementById('editSubmissionBtn');
    const finalSubmitBtn = document.getElementById('finalSubmitBtn');
    const reviewSectionTitle = document.getElementById('reviewSectionTitle');

    const customConfirmModal = document.getElementById('customConfirmModal');
    const customConfirmModalTitle = document.getElementById('customConfirmModalTitle');
    const customConfirmModalMessage = document.getElementById('customConfirmModalMessage');
    const customConfirmModalCloseBtn = document.getElementById('customConfirmModalCloseBtn');
    const customConfirmModalCancelBtn = document.getElementById('customConfirmModalCancelBtn');
    const customConfirmModalConfirmBtn = document.getElementById('customConfirmModalConfirmBtn');
    
    // --- Admin Panel DOM Elements ---
    let adminSection, adminLoginDiv, adminDashboardDiv, adminLoginForm, adminUsernameInput,
        adminPasswordInput, adminLoginErrorDiv, closeAdminPanelBtn, adminGreetingElement,
        adminLogoutBtn, filterDateStartInput, filterDateEndInput, filterStoreNameInput,
        applyFiltersBtn, clearFiltersBtn, adminSubmissionsListContainer, adminSubmissionsListDiv,
        deleteSelectedSubmissionsBtn, selectedSubmissionsCountSpan, adminSelectedActionsContainer,
        submissionDetailModal, submissionDetailModalTitleDOM, submissionDetailContentDiv,
        submissionDetailCloseBtn, submissionDetailModalSecondaryCloseBtn,
        extractPdfBtn, showAdminLoginBtn;

    // --- Flyer UI State ---
    const productDataStore = new Map();
    let nextProductId = 1;
    let countdownInterval;
    let initialSubmissionDate = new Date();
    let currentAppStep = 'store-info'; // Initial step
    let elementThatOpenedDrawer = null;
    let elementThatOpenedModal = null;
    let currentConfirmCallback = null;
    let printMaterialSelections = { priceTags: false, posters: false, banners: false, notes: "" };
    let lastActiveStepBeforeReview = 'store-info';
    const stepCompletionStatus = { 
        'store-info': false, 
        'add-products': false, 
        'social-print': false, 
        'review': false 
    };
    const stepOrder = ['store-info', 'add-products', 'social-print', 'review'];

    // --- Admin Panel State ---
    let selectedSubmissionIds = new Set();
    let currentGlightboxInstance = null;

    // --- Utility Functions ---
    function escapeHtml(string) {
        if (typeof string !== 'string') return String(string === null || string === undefined ? "" : string);
        return string.replace(/[&<>"']/g, m => ESCAPE_HTML_MAP[m]);
    }

    function createSVGElement(tag, attributes) {
        const el = document.createElementNS(SVG_NS, tag);
        for (const key in attributes) { el.setAttribute(key, attributes[key]); }
        return el;
    }

    function formatDate(dateStr) {
        if (!dateStr) return 'N/A';
        const date = new Date(dateStr);
        if (!(date instanceof Date) || isNaN(date.getTime())) return 'N/A';
        const adjustedDate = new Date(date.valueOf() + date.getTimezoneOffset() * 60 * 1000);
        const y = adjustedDate.getFullYear();
        const m = (adjustedDate.getMonth() + 1).toString().padStart(2, '0');
        const d = adjustedDate.getDate().toString().padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    function formatDateTime(dateStr) {
        if (!dateStr) return 'N/A';
        const date = new Date(dateStr);
        if (!(date instanceof Date) || isNaN(date.getTime())) return 'N/A';
        const opts = { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true };
        return date.toLocaleString(undefined, opts);
    }
    
    function setButtonEnabled(buttonElement, isEnabled, enabledTitle = '', disabledTitle = 'Please complete prerequisites.') {
        if (buttonElement) {
            buttonElement.disabled = !isEnabled;
            buttonElement.classList.toggle('opacity-50', !isEnabled);
            buttonElement.classList.toggle('cursor-not-allowed', !isEnabled);
            if (!isEnabled) {
                buttonElement.setAttribute('aria-disabled', 'true');
                buttonElement.title = disabledTitle;
            } else {
                buttonElement.removeAttribute('aria-disabled');
                buttonElement.title = enabledTitle || buttonElement.textContent.trim();
            }
        }
    }
    
    function updateNextButtonVisibility() {
        if (nextStepStoreInfoBtn) nextStepStoreInfoBtn.style.display = (currentAppStep === 'store-info') ? 'block' : 'none';
        if (nextStepAddProductsBtn) nextStepAddProductsBtn.style.display = (currentAppStep === 'add-products') ? 'block' : 'none';
        if (reviewSubmitBtn) reviewSubmitBtn.style.display = (currentAppStep === 'social-print') ? 'block' : 'none';
    }

    // --- Flyer UI Validation Functions ---
    function validateStoreInfo() {
        const errors = [];
        const fieldsToValidate = [
            { input: storeNameInput, name: "Store Name", required: true },
            { input: submittedByInput, name: "Submitted By", required: true },
            { input: startDateInput, name: "Start Date", required: true, isDate: true },
            { input: endDateInput, name: "End Date", required: true, isDate: true }
        ];

        fieldsToValidate.forEach(field => {
            if (field.input) {
                field.input.classList.remove(ERROR_BORDER_CLASS);
                field.input.classList.add('border-brand-neutral-border');
            }
        });

        fieldsToValidate.forEach(field => {
            if (field.required && field.input && !field.input.value.trim()) {
                errors.push(`${field.name} is required.`);
                if (field.input) {
                    field.input.classList.remove('border-brand-neutral-border');
                    field.input.classList.add(ERROR_BORDER_CLASS);
                }
            }
        });

        if (startDateInput?.value && endDateInput?.value) {
            const startDateVal = new Date(startDateInput.value);
            const endDateVal = new Date(endDateInput.value);
            if (endDateVal < startDateVal) {
                errors.push("End Date cannot be before Start Date.");
                if (endDateInput) {
                    endDateInput.classList.remove('border-brand-neutral-border');
                    endDateInput.classList.add(ERROR_BORDER_CLASS);
                }
            }
        }
        return errors;
    }

    function checkStoreInfoCompletion() {
        const storeErrors = validateStoreInfo();
        const isComplete = storeErrors.length === 0;
        
        if (stepCompletionStatus['store-info'] !== isComplete) {
            stepCompletionStatus['store-info'] = isComplete;
            updateStepperVisuals(); 
        }
        setButtonEnabled(nextStepStoreInfoBtn, isComplete, 'Proceed to Add Products', 'Please complete all required fields in Store Information.');
        updateAddProductControlsAvailability(); 
        return isComplete;
    }

    function updateAddProductControlsAvailability() {
        const storeInfoDone = stepCompletionStatus['store-info'];
        const addSlots = productGridArea?.querySelectorAll('.add-product-slot');

        if (addSlots) {
            addSlots.forEach(slot => {
                slot.classList.toggle('disabled-slot', !storeInfoDone);
                slot.title = storeInfoDone ? 'Add Product' : 'Complete Step 1: Store Info to add products.';
            });
        }

        const pageButtons = [addPageToolbarBtn].filter(btn => btn); 
        pageButtons.forEach(btn => {
            if (btn) {
                btn.disabled = !storeInfoDone;
                btn.classList.toggle('opacity-50', !storeInfoDone);
                btn.classList.toggle('cursor-not-allowed', !storeInfoDone);
                btn.title = storeInfoDone ? 'Add New Page' : 'Complete Step 1: Store Info to manage pages.';
            }
        });
        if (removePageToolbarBtn) {
            removePageToolbarBtn.disabled = !storeInfoDone;
            removePageToolbarBtn.classList.toggle('opacity-50', !storeInfoDone);
            removePageToolbarBtn.classList.toggle('cursor-not-allowed', !storeInfoDone);
            removePageToolbarBtn.title = storeInfoDone ? 'Remove Current Page' : 'Complete Step 1: Store Info to manage pages.';
        }
    }

    function checkAddProductsCompletion() {
        const productsExist = productDataStore.size > 0;
        if (stepCompletionStatus['add-products'] !== productsExist) {
            stepCompletionStatus['add-products'] = productsExist;
            updateStepperVisuals();
        }
        setButtonEnabled(nextStepAddProductsBtn, productsExist, 'Proceed to Social/Print Options', 'Please add at least one product.');
        
        if (reviewSubmitBtn) {
            const canReview = stepCompletionStatus['store-info'] && productsExist;
            setButtonEnabled(reviewSubmitBtn, canReview, 'Review & Submit Flyer &rarr;', 'Complete Store Info & Add Products to review.');
        }
        return productsExist;
    }

    function validateProductDrawer() {
        const errors = [];
        const fieldsToValidate = [
            { input: drawerProductNameInput, name: "Product Name", required: true },
            { input: drawerBrandNameInput, name: "Brand Name", required: true },
            { input: drawerCategorySelect, name: "Category", required: true },
            { input: drawerRegularPriceInput, name: "Regular Price", required: true, isNumeric: true },
            { input: drawerSalePriceInput, name: "Sale Price", required: true, isNumeric: true },
        ];

        fieldsToValidate.forEach(field => {
            if (field.input) {
                field.input.classList.remove(ERROR_BORDER_CLASS);
                field.input.classList.add('border-brand-neutral-border');
            }
        });
        if(drawerBundleItemsTextarea) {
            drawerBundleItemsTextarea.classList.remove(ERROR_BORDER_CLASS);
            drawerBundleItemsTextarea.classList.add('border-brand-neutral-border');
        }
        if(drawerIncludeInSocialCheckbox) {
            drawerIncludeInSocialCheckbox.closest('label')?.classList.remove('text-brand-red');
        }

        fieldsToValidate.forEach(field => {
            if (field.required && field.input && !field.input.value.trim()) {
                errors.push(`${field.name} is required.`);
                if (field.input) {
                    field.input.classList.remove('border-brand-neutral-border');
                    field.input.classList.add(ERROR_BORDER_CLASS);
                }
            }
            if (field.isNumeric && field.input && field.input.value.trim() && isNaN(parseFloat(field.input.value))) {
                errors.push(`${field.name} must be a valid number.`);
                if (field.input) {
                    field.input.classList.remove('border-brand-neutral-border');
                    field.input.classList.add(ERROR_BORDER_CLASS);
                }
            }
        });

        if (drawerIsBundleCheckbox?.checked && drawerBundleItemsTextarea && !drawerBundleItemsTextarea.value.trim()) {
            errors.push("Bundle Items description is required when 'Is this a Bundle?' is checked.");
            if(drawerBundleItemsTextarea) {
                drawerBundleItemsTextarea.classList.remove('border-brand-neutral-border');
                drawerBundleItemsTextarea.classList.add(ERROR_BORDER_CLASS);
            }
        }
        
        if (drawerSalePriceInput?.validationMessage && drawerSalePriceInput.validationMessage !== "") {
             errors.push(drawerSalePriceInput.validationMessage);
             drawerSalePriceInput.classList.remove('border-brand-neutral-border');
             drawerSalePriceInput.classList.add(ERROR_BORDER_CLASS);
        }
        if (drawerRegularPriceInput?.validationMessage && drawerRegularPriceInput.validationMessage !== "") {
             errors.push(drawerRegularPriceInput.validationMessage);
             drawerRegularPriceInput.classList.remove('border-brand-neutral-border');
             drawerRegularPriceInput.classList.add(ERROR_BORDER_CLASS);
        }

        if (drawerIncludeInSocialCheckbox?.checked) {
            let currentSocialCount = 0;
            const currentProductIdBeingEdited = productEditForm.dataset.currentProductId;
            productDataStore.forEach(p => { if (p.includeInSocial && p.id !== currentProductIdBeingEdited) currentSocialCount++; });

            if (currentSocialCount >= MAX_SOCIAL_PRODUCTS) {
                errors.push(`Max ${MAX_SOCIAL_PRODUCTS} social media products allowed. You've already selected ${currentSocialCount}. Uncheck this or another product.`);
                drawerIncludeInSocialCheckbox.closest('label')?.classList.add('text-brand-red');
            } else {
                drawerIncludeInSocialCheckbox.closest('label')?.classList.remove('text-brand-red');
            }
        }
        return errors;
    }

    // --- Product Data Store Functions ---
    function generateProductId() { return `product-${nextProductId++}`; }

    function storeProductData(productData) {
        if (!productData || !productData.id) {
            console.error("Invalid product data: ID is missing.", productData);
            return null;
        }
        const oldProductData = productDataStore.get(productData.id);
        productDataStore.set(productData.id, { ...productData });
        if (!oldProductData || oldProductData.includeInSocial !== productData.includeInSocial || (productData.includeInSocial && !oldProductData)) {
            renderSocialSelectionsDisplay();
        }
        checkAddProductsCompletion();
        return productDataStore.get(productData.id);
    }
    function getProductDataById(productId) { return productDataStore.get(productId); }
    function removeProductData(productId) {
        const product = productDataStore.get(productId);
        if (product) {
            productDataStore.delete(productId);
            renderSocialSelectionsDisplay();
            checkAddProductsCompletion();
            return true;
        }
        return false;
    }

    function calculateDrawerDiscount() {
        if (!drawerRegularPriceInput || !drawerSalePriceInput || !drawerDiscountPercentInput || !drawerManualDiscountField || !drawerManualDiscountDescriptionInput) {
            return;
        }
        drawerRegularPriceInput.setCustomValidity("");
        drawerSalePriceInput.setCustomValidity("");
        drawerDiscountPercentInput.value = ''; 

        const regularPrice = parseFloat(drawerRegularPriceInput.value);
        const salePrice = parseFloat(drawerSalePriceInput.value);
        const regularPriceStr = drawerRegularPriceInput.value.trim();
        const salePriceStr = drawerSalePriceInput.value.trim();
        const regularPriceIsZero = regularPriceStr === "0" || regularPriceStr === "0.0" || regularPriceStr === "0.00";
        const salePriceIsZero = salePriceStr === "0" || salePriceStr === "0.0" || salePriceStr === "0.00";

        if (regularPriceIsZero && salePriceIsZero && !isNaN(regularPrice) && regularPrice === 0 && !isNaN(salePrice) && salePrice === 0) {
            drawerDiscountPercentInput.placeholder = "N/A";
            drawerDiscountPercentInput.value = "N/A (Manual Discount Only)";
            drawerManualDiscountField.style.display = 'block';
            drawerManualDiscountDescriptionInput.disabled = false;
            drawerManualDiscountDescriptionInput.readOnly = false;
        } else {
            drawerManualDiscountField.style.display = 'none';
            drawerManualDiscountDescriptionInput.disabled = true;
            drawerManualDiscountDescriptionInput.readOnly = true;
            drawerManualDiscountDescriptionInput.value = ""; 
            drawerDiscountPercentInput.placeholder = "Auto-calculated";
            let autoCalcError = false;

            if (regularPriceStr !== "" && (isNaN(regularPrice) || regularPrice <= 0)) {
                drawerRegularPriceInput.setCustomValidity("Regular price must be > 0 for auto-calculation.");
                drawerDiscountPercentInput.value = "N/A (Invalid Regular Price)"; autoCalcError = true;
            }
            if (!autoCalcError && salePriceStr !== "" && isNaN(salePrice)) {
                drawerSalePriceInput.setCustomValidity("Invalid number for sale price.");
                drawerDiscountPercentInput.value = "Error (Invalid Sale Price)"; autoCalcError = true;
            }

            if (!autoCalcError && !isNaN(regularPrice) && regularPrice > 0 && !isNaN(salePrice)) {
                if (salePrice < 0) {
                    drawerSalePriceInput.setCustomValidity("Sale price must be non-negative.");
                    drawerDiscountPercentInput.value = "Error (Negative Sale Price)";
                } else if (salePrice >= regularPrice) {
                    if (salePriceStr !== "") { 
                        drawerSalePriceInput.setCustomValidity("Sale price must be less than regular price for discount.");
                        drawerDiscountPercentInput.value = "N/A (Sale Price Not Lower)";
                    } else { 
                        drawerDiscountPercentInput.value = "";
                    }
                } else { 
                    drawerDiscountPercentInput.value = (((regularPrice - salePrice) / regularPrice) * 100).toFixed(1) + '%';
                }
            } else if (!autoCalcError && (regularPriceStr === "" || salePriceStr === "")) {
                drawerDiscountPercentInput.value = "";
            }
        }
    }

function createProductCardDOM(productData) {
    const fragment = document.createDocumentFragment();
    const productNameText = productData.name || 'Unnamed Product';
    const brandNameText = productData.brand || 'N/A';
    const imageSrc = productData.imagePreviewUrl ||
        `https://placehold.co/300x300/F3F4F6/9CA3AF?text=${encodeURIComponent(productNameText.substring(0,15))}`;

    const cardInner = document.createElement('div');
    // Assuming you want shadow-lg on the card itself now.
    // The original newCardDiv in renderProductCardInGrid had:
    // "product-card group bg-white rounded-xl shadow-card hover:shadow-card-hover..."
    // You might want to consolidate shadow styling. Let's use what you had:
    cardInner.className = "group flex flex-col bg-white rounded-xl shadow-lg overflow-hidden"; // Added overflow-hidden just in case, though portaling helps.

    const imageActionsArea = document.createElement('div');
    imageActionsArea.className = "relative p-3"; // p-3 provides padding

    const imageWrapper = document.createElement('div');
    imageWrapper.className = "aspect-square w-full bg-brand-light-gray rounded-lg flex items-center justify-center mb-3 overflow-hidden";
    const img = document.createElement('img');
    img.src = imageSrc;
    img.alt = `${productNameText} Thumbnail`;
    img.className = "w-full h-full object-cover";
    img.onerror = () => {
        img.onerror = null; // Prevent infinite loop if placeholder also fails
        img.src = `https://placehold.co/300x300/E5E7EB/6B7280?text=Error`;
    };
    imageWrapper.append(img);
    imageActionsArea.append(imageWrapper);

    const actionsMenuButton = document.createElement('button');
    // Ensure PRODUCT_CARD_ACTIONS_MENU_RIGHT_OFFSET_CLASS is defined, e.g., 'right-4'
    actionsMenuButton.className = `actions-menu-button absolute top-4 ${PRODUCT_CARD_ACTIONS_MENU_RIGHT_OFFSET_CLASS} p-1.5 bg-white/80 backdrop-blur-sm rounded-full text-brand-medium-gray hover:text-brand-blue hover:bg-white focus:outline-none opacity-0 group-hover:opacity-100 transition-opacity duration-150`;
    actionsMenuButton.setAttribute('aria-haspopup', 'true');
    actionsMenuButton.setAttribute('aria-expanded', 'false');
    actionsMenuButton.dataset.productId = productData.id; // Store product ID for later
    const menuIcon = createSVGElement('svg', { class: "w-5 h-5", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" });
    menuIcon.appendChild(createSVGElement('path', { "stroke-linecap": "round", "stroke-linejoin": "round", "stroke-width": "2", d: "M12 5v.01M12 12v.01M12 19v.01" }));
    actionsMenuButton.append(menuIcon);
    imageActionsArea.append(actionsMenuButton);
    cardInner.append(imageActionsArea);

    // DROPDOWN (created here, but appended and positioned on click)
    const actionsDropdown = document.createElement('div');
    actionsDropdown.className = "actions-dropdown absolute w-40 bg-white rounded-md shadow-xl py-1 z-[9999] hidden ring-1 ring-black ring-opacity-5"; // Increased z-index
    actionsDropdown.setAttribute('role', 'menu');
    actionsDropdown.dataset.ownerProductId = productData.id; // Link dropdown to product

    // Build menu items
    ['Edit', 'Delete'].forEach(actionText => {
        const link = document.createElement('a');
        link.href = "#";
        link.className = `${actionText.toLowerCase()}-action group flex items-center w-full px-4 py-3 text-sm ${
            actionText === 'Edit'
                ? "text-brand-dark-gray hover:bg-gray-100 hover:text-brand-blue rounded-t-md"
                : "text-brand-red hover:bg-red-50 hover:text-red-700 rounded-b-md"
        }`;
        link.setAttribute('role', 'menuitem');

        const icon = createSVGElement('svg', {
            class: "w-5 h-5 mr-3 flex-shrink-0", // Tailwind classes for icon
            fill: "none", stroke: "currentColor", viewBox: "0 0 24 24"
        });
        const pathD = actionText === 'Edit'
            ? "M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
            : "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16";
        icon.appendChild(createSVGElement('path', { "stroke-linecap": "round", "stroke-linejoin": "round", "stroke-width": "2", d: pathD }));

        link.append(icon, document.createTextNode(actionText)); // Correctly adds "Edit" or "Delete"

        // **** FIX FOR NON-WORKING BUTTONS ****
        link.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();

            const currentProduct = getProductDataById(productData.id); // Get fresh data

            if (actionText === 'Edit') {
                if (currentProduct) openDrawer('edit', currentProduct);
                else console.error("Product not found for edit:", productData.id);
            } else if (actionText === 'Delete') {
                if (currentProduct) {
                    showCustomConfirmModal(
                        `Are you sure you want to delete "${escapeHtml(currentProduct.name)}"?`,
                        "Confirm Deletion", "Yes, Delete",
                        () => {
                            if (removeProductData(productData.id)) {
                                // Find the card in the DOM to remove it.
                                // The card's root element is `cardInner`'s parent.
                                // We need to find the element that was added to productGridArea.
                                // This function createProductCardDOM returns a fragment.
                                // The actual card div is created in renderProductCardInGrid.
                                // We need to rely on data-product-id attribute on the card.
                                const cardElementInGrid = document.querySelector(`.product-card[data-product-id="${productData.id}"]`);
                                if (cardElementInGrid) {
                                    cardElementInGrid.remove();
                                }
                                updateProductCounter(); // Assumes this function is globally available
                            }
                        }
                    );
                } else {
                    console.error("Product not found for delete:", productData.id);
                }
            }
            actionsDropdown.classList.add('hidden'); // Close dropdown after action
            actionsMenuButton.setAttribute('aria-expanded', 'false');
            if (actionsDropdown.parentElement === document.body) { // Remove from body if it was added
                document.body.removeChild(actionsDropdown);
            }
        });
        actionsDropdown.append(link);
    });

    actionsMenuButton.addEventListener('click', (clickEvent) => {
        clickEvent.stopPropagation();

        // Close any other open dropdowns first
        document.querySelectorAll('div.actions-dropdown[data-is-portaled="true"]').forEach(otherDd => {
            if (otherDd !== actionsDropdown) {
                otherDd.classList.add('hidden');
                if (otherDd.parentElement === document.body) document.body.removeChild(otherDd);
                const otherButtonId = otherDd.dataset.triggerButtonId;
                if (otherButtonId) {
                    const otherBtn = document.getElementById(otherButtonId);
                    if (otherBtn) otherBtn.setAttribute('aria-expanded', 'false');
                }
            }
        });

        const isHidden = actionsDropdown.classList.contains('hidden');
        if (isHidden) {
            if (actionsDropdown.parentElement !== document.body) {
                document.body.appendChild(actionsDropdown); // Append to body only when showing
            }
            actionsDropdown.dataset.isPortaled = "true";
            if (!actionsMenuButton.id) actionsMenuButton.id = `actions-btn-${productData.id}`; // Ensure button has an ID
            actionsDropdown.dataset.triggerButtonId = actionsMenuButton.id;


            const rect = actionsMenuButton.getBoundingClientRect();
            actionsDropdown.style.top = `${rect.bottom + window.scrollY + 2}px`; // 2px gap

            // Position: try to align left edges, then adjust if off-screen
            let leftPos = rect.left + window.scrollX;
            actionsDropdown.style.left = `${leftPos}px`;
            actionsDropdown.style.right = 'auto'; // Clear right property

            // Make visible to measure offsetWidth correctly
            actionsDropdown.classList.remove('hidden');
            actionsMenuButton.setAttribute('aria-expanded', 'true');

            // Adjust if it goes off-screen to the right
            const dropdownActualWidth = actionsDropdown.offsetWidth; // Get width after it's visible
            if (leftPos + dropdownActualWidth > window.innerWidth + window.scrollX - 10) { // 10px buffer
                leftPos = rect.right + window.scrollX - dropdownActualWidth;
                actionsDropdown.style.left = `${leftPos}px`;
            }
             // Ensure it's not off-screen to the left
            if (leftPos < window.scrollX + 10) { // 10px buffer
                actionsDropdown.style.left = `${window.scrollX + 10}px`;
            }


        } else {
            actionsDropdown.classList.add('hidden');
            actionsMenuButton.setAttribute('aria-expanded', 'false');
            if (actionsDropdown.parentElement === document.body) {
                 document.body.removeChild(actionsDropdown);
            }
        }
    });

    // TEXT INFO & PRICE AREA
    const textInfoArea = document.createElement('div');
    textInfoArea.className = "px-4 pb-4 flex-grow flex flex-col mt-auto"; // Added mt-auto to push price to bottom

    const productNameHeader = document.createElement('h4');
    productNameHeader.className = "font-semibold text-brand-dark-gray text-sm mb-0.5 truncate";
    productNameHeader.title = productNameText;
    productNameHeader.textContent = productNameText;

    const brandNamePara = document.createElement('p');
    brandNamePara.className = "text-xs text-brand-medium-gray mb-2";
    brandNamePara.textContent = brandNameText;

    // ... (Your existing textInfoArea + pricing logic here, ensure it's complete)
    const priceDisplayWrapper = document.createElement('div');
    priceDisplayWrapper.className = "flex items-baseline flex-wrap gap-x-2 gap-y-1"; // Removed mt-auto from here

    const regularPriceNum = parseFloat(productData.regularPrice);
    const salePriceNum = parseFloat(productData.salePrice);
    const manualDescText = productData.manualDiscountDescription?.trim();
    let mainPriceHtml = '';
    let discountBadgeNode = null;

    if (!isNaN(salePriceNum) && !isNaN(regularPriceNum) && salePriceNum < regularPriceNum && regularPriceNum > 0) {
        mainPriceHtml = `
            <span class="text-brand-dark-gray font-bold text-lg leading-none">$${salePriceNum.toFixed(2)}</span>
            <del class="text-gray-500 text-sm leading-none">$${regularPriceNum.toFixed(2)}</del>
        `;
        const percentageOff = Math.round(((regularPriceNum - salePriceNum) / regularPriceNum) * 100);
        discountBadgeNode = document.createElement('span');
        discountBadgeNode.className = "bg-brand-red text-white text-xs font-semibold px-2.5 py-1 rounded-full leading-none";
        discountBadgeNode.textContent = `${percentageOff}% OFF`;
    } else if (manualDescText &&
             (isNaN(regularPriceNum) || regularPriceNum === 0 || productData.regularPrice?.toString().trim() === "0" || productData.regularPrice?.toString().trim() === "0.00") &&
             (isNaN(salePriceNum) || salePriceNum === 0 || productData.salePrice?.toString().trim() === "0" || productData.salePrice?.toString().trim() === "0.00") ) {
        mainPriceHtml = '';
        discountBadgeNode = document.createElement('span');
        discountBadgeNode.className = "bg-brand-red text-white text-xs font-semibold px-2.5 py-1 rounded-full leading-tight inline-block";
        if (!isNaN(parseFloat(manualDescText)) && !manualDescText.includes('%')) {
            discountBadgeNode.textContent = `${escapeHtml(manualDescText)}% OFF`;
        } else {
            discountBadgeNode.textContent = escapeHtml(manualDescText);
        }
    } else if (!isNaN(regularPriceNum) && regularPriceNum > 0) {
        mainPriceHtml = `<span class="text-brand-dark-gray font-bold text-lg leading-none">$${regularPriceNum.toFixed(2)}</span>`;
    } else {
        mainPriceHtml = `<span class="text-gray-500 font-bold text-lg leading-none">$0.00</span>`;
    }

    priceDisplayWrapper.innerHTML = mainPriceHtml;
    if (discountBadgeNode) {
        priceDisplayWrapper.appendChild(discountBadgeNode);
    }

    textInfoArea.appendChild(productNameHeader);
    textInfoArea.appendChild(brandNamePara);
    textInfoArea.appendChild(priceDisplayWrapper); // Price wrapper is part of textInfoArea

    cardInner.append(textInfoArea);
    fragment.append(cardInner);
    return fragment;
}

    function renderProductCardInGrid(productData, isUpdate = false) {
        if (!productData || !productData.id) return;

        const cardFragment = createProductCardDOM(productData);
        let targetCardElement;

        const activePageContent = document.querySelector('.page-content:not([style*="display: none"])');
        if (!activePageContent) {
            console.warn("No active page content found to render product card.");
            return;
        }
        const gridInActivePage = activePageContent.querySelector('.grid'); 
        if (!gridInActivePage) {
            console.warn("No grid found in active page content.");
            return;
        }

        if (isUpdate) {
            targetCardElement = gridInActivePage.querySelector(`.product-card[data-product-id="${productData.id}"]`);
            if (targetCardElement) {
                targetCardElement.innerHTML = ''; 
                targetCardElement.appendChild(cardFragment);
            } else {
                console.warn(`Tried to update product card ${productData.id}, but it was not found on the current page. Adding as new.`);
                isUpdate = false; 
            }
        }

        if (!isUpdate && !targetCardElement) { 
            let emptySlot = gridInActivePage.querySelector('.add-product-slot');
            const newCardDiv = document.createElement('div');
            newCardDiv.className = "product-card group bg-white rounded-xl shadow-card hover:shadow-card-hover transition-all duration-200 ease-in-out flex flex-col cursor-pointer transform hover:scale-[1.02]";
            newCardDiv.dataset.productId = productData.id;
            newCardDiv.appendChild(cardFragment);

            if (emptySlot) {
                emptySlot.parentNode.insertBefore(newCardDiv, emptySlot);
            } else {
                gridInActivePage.appendChild(newCardDiv);
            }
        }
        updateProductCounter(); 
    }

    function updateProductCounter() {
        const activePageContent = document.querySelector('.page-content:not([style*="display: none"])');
        if (!activePageContent) return;

        const counterElement = activePageContent.querySelector('.flyerProductCounter');
        const gridInActivePage = activePageContent.querySelector('.grid');

        if (counterElement && gridInActivePage) {
            const filledSlots = gridInActivePage.querySelectorAll('.product-card[data-product-id]').length;
            const maxSlots = parseInt(activePageContent.dataset.maxSlots) || (activePageContent.id === 'page-1-content' ? PAGE_1_MAX_SLOTS : PAGE_DEFAULT_MAX_SLOTS);
            activePageContent.dataset.maxSlots = maxSlots; 
            counterElement.textContent = `Slots Filled: ${filledSlots} / ${maxSlots}`;
        }
    }

    function openDrawer(mode = 'add', productData = null) {
        if (!editProductDrawer || !productEditForm || !drawerTitleElement) {
            console.error("Drawer elements missing in openDrawer");
            return;
        }
        elementThatOpenedDrawer = document.activeElement; 

        drawerTitleElement.textContent = mode === 'add' ? 'Add New Product' : 'Edit Product';
        productEditForm.reset(); 
        productEditForm.dataset.currentProductId = ''; 
        if(drawerErrorMessage) { drawerErrorMessage.textContent = ''; drawerErrorMessage.style.display = 'none'; }
        
        productEditForm.querySelectorAll('.' + ERROR_BORDER_CLASS + ', .border-brand-red, .text-brand-red').forEach(el => {
            el.classList.remove(ERROR_BORDER_CLASS, 'border-brand-red', 'text-brand-red');
            if(el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA') {
                el.classList.add('border-brand-neutral-border');
            }
        });

        if (drawerImagePreview) drawerImagePreview.innerHTML = '<small>No image selected. Recommended: Square, max 5MB.</small>';
        if (drawerProductImageInput) drawerProductImageInput.value = ''; 

        if (drawerBundleItemsContainer && drawerIsBundleCheckbox) {
            drawerBundleItemsContainer.style.display = 'none';
            drawerIsBundleCheckbox.checked = false;
            if (drawerBundleItemsTextarea) drawerBundleItemsTextarea.required = false;
        }

        if (mode === 'edit' && productData && productData.id) {
            productEditForm.dataset.currentProductId = productData.id;
            if(drawerProductNameInput) drawerProductNameInput.value = productData.name || '';
            if(drawerBrandNameInput) drawerBrandNameInput.value = productData.brand || '';
            if(drawerSkuInput) drawerSkuInput.value = productData.sku || '';
            if(drawerCategorySelect) drawerCategorySelect.value = productData.category || '';

            if (productData.imagePreviewUrl && drawerImagePreview) {
                drawerImagePreview.innerHTML = `<img src="${productData.imagePreviewUrl}" alt="Preview" class="max-w-[100px] max-h-[100px] inline-block mr-2 border rounded-md border-brand-neutral-border"/> <small>${escapeHtml(productData.imageFileName) || 'Uploaded image'}</small>`;
            }

            if(drawerDescriptionTextarea) drawerDescriptionTextarea.value = productData.description || '';
            if(drawerSizeDimensionsInput) drawerSizeDimensionsInput.value = productData.sizeDimensions || '';
            if(drawerColourFinishInput) drawerColourFinishInput.value = productData.colourFinish || '';
            if(drawerRegularPriceInput) drawerRegularPriceInput.value = productData.regularPrice || '';
            if(drawerSalePriceInput) drawerSalePriceInput.value = productData.salePrice || '';
            if(drawerManualDiscountDescriptionInput) drawerManualDiscountDescriptionInput.value = productData.manualDiscountDescription || '';
            
            if (drawerIsBundleCheckbox && drawerBundleItemsTextarea && drawerBundleItemsContainer) {
                drawerIsBundleCheckbox.checked = productData.isBundle || false;
                drawerBundleItemsContainer.style.display = productData.isBundle ? 'block' : 'none';
                drawerBundleItemsTextarea.value = productData.bundleItems || '';
                drawerBundleItemsTextarea.required = productData.isBundle || false;
            }

            if(drawerIsMainFlyerProductCheckbox) drawerIsMainFlyerProductCheckbox.checked = productData.isMainFlyerProduct || false;
            if(drawerRequestStockImageCheckbox) drawerRequestStockImageCheckbox.checked = productData.requestStockImage || false;
            if(drawerIncludeInSocialCheckbox) drawerIncludeInSocialCheckbox.checked = productData.includeInSocial || false;
        } else {
            if(drawerIsMainFlyerProductCheckbox) drawerIsMainFlyerProductCheckbox.checked = false;
            if(drawerIsBundleCheckbox) drawerIsBundleCheckbox.checked = false;
            if(drawerRequestStockImageCheckbox) drawerRequestStockImageCheckbox.checked = false;
            if(drawerIncludeInSocialCheckbox) drawerIncludeInSocialCheckbox.checked = false;
        }

        calculateDrawerDiscount();

        editProductDrawer.classList.remove('translate-x-full');
        editProductDrawer.classList.add('translate-x-0');
        editProductDrawer.setAttribute('aria-hidden', 'false');

        const firstFocusableElement = editProductDrawer.querySelector('input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])');
        if (firstFocusableElement) firstFocusableElement.focus();
    }

    function closeDrawer() {
        if (!editProductDrawer) return;
        editProductDrawer.classList.remove('translate-x-0');
        editProductDrawer.classList.add('translate-x-full');
        editProductDrawer.setAttribute('aria-hidden', 'true');

        if (productEditForm) {
            productEditForm.reset();
            productEditForm.dataset.currentProductId = '';
            if (drawerImagePreview) drawerImagePreview.innerHTML = '<small>No image selected. Recommended: Square, max 5MB.</small>';
            if (drawerProductImageInput) drawerProductImageInput.value = '';
            if (drawerErrorMessage) { drawerErrorMessage.textContent = ''; drawerErrorMessage.style.display = 'none';}
            productEditForm.querySelectorAll('.' + ERROR_BORDER_CLASS + ', .border-brand-red, .text-brand-red').forEach(el => {
                el.classList.remove(ERROR_BORDER_CLASS, 'border-brand-red', 'text-brand-red');
                if(el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA') {
                    el.classList.add('border-brand-neutral-border');
                }
            });
        }
        if (elementThatOpenedDrawer) { elementThatOpenedDrawer.focus(); elementThatOpenedDrawer = null; }
    }
    
    if (closeDrawerBtn) closeDrawerBtn.addEventListener('click', closeDrawer);
    if (cancelDrawerBtn) cancelDrawerBtn.addEventListener('click', closeDrawer);
    if (drawerRegularPriceInput) drawerRegularPriceInput.addEventListener('input', calculateDrawerDiscount);
    if (drawerSalePriceInput) drawerSalePriceInput.addEventListener('input', calculateDrawerDiscount);
    if (drawerRegularPriceInput) drawerRegularPriceInput.addEventListener('blur', calculateDrawerDiscount); 
    if (drawerSalePriceInput) drawerSalePriceInput.addEventListener('blur', calculateDrawerDiscount);

    if (drawerProductImageInput && drawerImagePreview) {
        drawerProductImageInput.addEventListener('change', function(event) {
            const file = event.target.files[0];
            if (file) {
                if (!file.type.startsWith('image/')) {
                    drawerImagePreview.innerHTML = '<small class="text-brand-red">Invalid file type. Please select an image.</small>';
                    event.target.value = ''; 
                    return;
                }
                if (file.size > IMAGE_MAX_FILE_SIZE_MB * 1024 * 1024) {
                    drawerImagePreview.innerHTML = `<small class="text-brand-red">File too large (Max ${IMAGE_MAX_FILE_SIZE_MB}MB).</small>`;
                    event.target.value = ''; 
                    return;
                }
                const reader = new FileReader();
                reader.onload = function(e) {
                    drawerImagePreview.innerHTML = `<img src="${e.target.result}" alt="Image Preview" class="max-w-[100px] max-h-[100px] inline-block mr-2 border rounded-md border-brand-neutral-border"/> <small>${escapeHtml(file.name)}</small>`;
                }
                reader.readAsDataURL(file);
            } else {
                drawerImagePreview.innerHTML = '<small>No image selected. Recommended: Square, max 5MB.</small>';
            }
        });
    }
    if (drawerIsBundleCheckbox && drawerBundleItemsContainer && drawerBundleItemsTextarea) {
        drawerIsBundleCheckbox.addEventListener('change', (e) => {
            const isChecked = e.target.checked;
            drawerBundleItemsContainer.style.display = isChecked ? 'block' : 'none';
            drawerBundleItemsTextarea.required = isChecked;
            if (isChecked) drawerBundleItemsTextarea.focus();
        });
    }

    if (saveDrawerBtn) saveDrawerBtn.addEventListener('click', () => {
        if (!productEditForm || !drawerErrorMessage) return;
        drawerErrorMessage.textContent = ''; drawerErrorMessage.style.display = 'none';

        const validationErrors = validateProductDrawer();
        if (validationErrors.length > 0) {
            drawerErrorMessage.innerHTML = "<strong>Please correct the following errors:</strong><br>- " + validationErrors.join("<br>- ");
            drawerErrorMessage.style.display = 'block';
            const firstInvalidDrawerField = productEditForm.querySelector('.' + ERROR_BORDER_CLASS + ', .border-brand-red, .text-brand-red');
            if (firstInvalidDrawerField) {
                if (firstInvalidDrawerField.tagName === 'LABEL') { 
                    firstInvalidDrawerField.querySelector('input')?.focus();
                } else {
                    firstInvalidDrawerField.focus();
                }
            }
            return;
        }

        const currentProductId = productEditForm.dataset.currentProductId;
        const isEditing = !!currentProductId;
        const existingProductData = isEditing ? getProductDataById(currentProductId) : {};

        const newProductData = {
            id: currentProductId || generateProductId(),
            name: drawerProductNameInput.value,
            brand: drawerBrandNameInput.value,
            sku: drawerSkuInput.value,
            category: drawerCategorySelect.value,
            imageFileName: drawerProductImageInput.files[0]?.name || existingProductData.imageFileName || '',
            imagePreviewUrl: drawerImagePreview.querySelector('img')?.src || existingProductData.imagePreviewUrl || '', 
            description: drawerDescriptionTextarea.value,
            sizeDimensions: drawerSizeDimensionsInput.value,
            colourFinish: drawerColourFinishInput.value,
            regularPrice: drawerRegularPriceInput.value,
            salePrice: drawerSalePriceInput.value,
            discountPercent: drawerDiscountPercentInput.value,
            manualDiscountDescription: drawerManualDiscountDescriptionInput.value,
            isMainFlyerProduct: drawerIsMainFlyerProductCheckbox.checked,
            isBundle: drawerIsBundleCheckbox.checked,
            bundleItems: drawerBundleItemsTextarea.value,
            requestStockImage: drawerRequestStockImageCheckbox.checked,
            includeInSocial: drawerIncludeInSocialCheckbox.checked,
        };

        const storedProduct = storeProductData(newProductData);
        if (storedProduct) {
            renderProductCardInGrid(storedProduct, isEditing);
        }
        closeDrawer();
    });

    function setupProductCardActions() {
        if (!productGridArea) return;
        productGridArea.addEventListener('click', function(event) {
            const menuButton = event.target.closest('.actions-menu-button');
            const editButton = event.target.closest('.edit-action');
            const deleteButton = event.target.closest('.delete-action');
            const productCardItself = event.target.closest('.product-card:not(.add-product-slot)');
            const addSlot = event.target.closest('.add-product-slot');

            if (menuButton) {
                event.stopPropagation(); 
                const productCard = menuButton.closest('.product-card');
                if (!productCard) return;
                const dropdown = productCard.querySelector('.actions-dropdown');
                if (!dropdown) return;
                document.querySelectorAll('.actions-dropdown:not(.hidden)').forEach(dd => {
                    if (dd !== dropdown) {
                        dd.classList.add('hidden');
                        dd.closest('.product-card')?.querySelector('.actions-menu-button')?.setAttribute('aria-expanded', 'false');
                    }
                });
                dropdown.classList.toggle('hidden');
                menuButton.setAttribute('aria-expanded', !dropdown.classList.contains('hidden'));
            } else if (editButton) {
                event.preventDefault(); event.stopPropagation();
                const productCard = editButton.closest('.product-card');
                const productId = productCard?.dataset.productId;
                if (productId) {
                    const productToEdit = getProductDataById(productId);
                    if (productToEdit) openDrawer('edit', productToEdit);
                    else openDrawer('add'); 
                } else openDrawer('add'); 
                const dropdown = editButton.closest('.actions-dropdown');
                if (dropdown) {
                    dropdown.classList.add('hidden');
                    dropdown.closest('.product-card')?.querySelector('.actions-menu-button')?.setAttribute('aria-expanded', 'false');
                }
            } else if (deleteButton) {
                event.preventDefault(); event.stopPropagation();
                const productCard = deleteButton.closest('.product-card');
                const productId = productCard?.dataset.productId;
                const product = productId ? getProductDataById(productId) : null;
                const dropdown = deleteButton.closest('.actions-dropdown');
                if (dropdown) { 
                    dropdown.classList.add('hidden');
                    dropdown.closest('.product-card')?.querySelector('.actions-menu-button')?.setAttribute('aria-expanded', 'false');
                }
                if (productId && product) {
                    showCustomConfirmModal(
                        `Are you sure you want to delete "${escapeHtml(product.name)}"? This cannot be undone.`,
                        "Confirm Product Deletion", "Yes, Delete",
                        () => { 
                            if (removeProductData(productId)) {
                                productCard?.remove();
                                updateProductCounter(); 
                            }
                        }
                    );
                }
            } else if (addSlot) {
                if (!stepCompletionStatus['store-info']) {
                    showCustomConfirmModal("Please complete Store Information (Step 1) before adding products.", "Prerequisite Incomplete", "OK", () => {
                        navigateToStep('store-info');
                        storeNameInput?.focus(); 
                    });
                    return;
                }
                const activePageContent = document.querySelector('.page-content:not([style*="display: none"])');
                if (!activePageContent) return;
                const gridInActivePage = activePageContent.querySelector('.grid');
                const filledSlots = gridInActivePage.querySelectorAll('.product-card[data-product-id]').length;
                const maxSlots = parseInt(activePageContent.dataset.maxSlots) || PAGE_DEFAULT_MAX_SLOTS;

                if (filledSlots >= maxSlots) {
                    showCustomConfirmModal(`Maximum ${maxSlots} products allowed for this page. Please add a new page or remove an existing product to continue.`, "Page Full", "OK", () => {});
                    return;
                }
                openDrawer('add');
            } else if (productCardItself && !event.target.closest('.actions-menu-button, .actions-dropdown')) {
                const productId = productCardItself.dataset.productId;
                if (productId) {
                    const productToEdit = getProductDataById(productId);
                    if (productToEdit) openDrawer('edit', productToEdit);
                }
            } else {
                document.querySelectorAll('.actions-dropdown:not(.hidden)').forEach(dd => {
                    dd.classList.add('hidden');
                    dd.closest('.product-card')?.querySelector('.actions-menu-button')?.setAttribute('aria-expanded', 'false');
                });
            }
        });
    }
    document.addEventListener('click', function(event) {
        const openDropdowns = document.querySelectorAll('.actions-dropdown:not(.hidden)');
        openDropdowns.forEach(dropdown => {
            if (!dropdown.closest('.product-card')?.contains(event.target)) {
                dropdown.classList.add('hidden');
                dropdown.closest('.product-card')?.querySelector('.actions-menu-button')?.setAttribute('aria-expanded', 'false');
            }
        });
    });

    // --- Custom Confirmation Modal Logic ---
    function showCustomConfirmModal(message, title = "Action Required", confirmButtonText = "OK", onConfirm) {
        if (!customConfirmModal || !customConfirmModalMessage || !customConfirmModalConfirmBtn || !customConfirmModalTitle) return;
        elementThatOpenedModal = document.activeElement; 
        customConfirmModalMessage.innerHTML = message; 
        customConfirmModalTitle.textContent = title;
        customConfirmModalConfirmBtn.textContent = confirmButtonText;

        if (customConfirmModalCancelBtn) {
            if (confirmButtonText.toLowerCase() === "ok" && 
                title !== "Confirm Product Deletion" && 
                title !== "Confirm Page Deletion" &&
                title !== "Final Submission Confirmation" &&
                title !== "Submission Complete" && 
                title !== "Create New Flyer?") { 
                customConfirmModalCancelBtn.style.display = 'none';
            } else {
                customConfirmModalCancelBtn.style.display = 'inline-flex';
            }
        }

        currentConfirmCallback = onConfirm; 

        customConfirmModal.classList.remove('opacity-0', 'pointer-events-none');
        customConfirmModal.setAttribute('aria-hidden', 'false');
        const modalDialog = customConfirmModal.querySelector('.bg-white'); 
        requestAnimationFrame(() => { 
            if (modalDialog) modalDialog.classList.remove('scale-95', 'opacity-0');
        });
        customConfirmModalConfirmBtn.focus();
    }

    function hideCustomConfirmModal() {
        if (!customConfirmModal) return;
        const modalDialog = customConfirmModal.querySelector('.bg-white');
        if (modalDialog) modalDialog.classList.add('scale-95', 'opacity-0');
        customConfirmModal.classList.add('opacity-0');
        setTimeout(() => {
            customConfirmModal.classList.add('pointer-events-none');
            customConfirmModal.setAttribute('aria-hidden', 'true');
            if (elementThatOpenedModal) { elementThatOpenedModal.focus(); elementThatOpenedModal = null; }
        }, 300); 
        currentConfirmCallback = null; 
    }
    
    if (customConfirmModalConfirmBtn) {
        customConfirmModalConfirmBtn.addEventListener('click', () => {
            const callbackToExecute = currentConfirmCallback; 
            currentConfirmCallback = null; 
            if (typeof callbackToExecute === 'function') {
                callbackToExecute(); 
            }
            if (currentConfirmCallback === null) { 
                hideCustomConfirmModal();
            }
        });
    }

    if (customConfirmModalCancelBtn) customConfirmModalCancelBtn.addEventListener('click', hideCustomConfirmModal);
    if (customConfirmModalCloseBtn) customConfirmModalCloseBtn.addEventListener('click', hideCustomConfirmModal);
    
    if (customConfirmModal) {
        customConfirmModal.addEventListener('click', (e) => {
            if (e.target === customConfirmModal) { 
                hideCustomConfirmModal();
            }
        });
    }
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            if (editProductDrawer && !editProductDrawer.classList.contains('translate-x-full')) {
                closeDrawer();
            } else if (customConfirmModal && !customConfirmModal.classList.contains('pointer-events-none')) {
                hideCustomConfirmModal();
            } else if (submissionDetailModal && !submissionDetailModal.classList.contains('pointer-events-none')) {
                closeSubmissionDetailModal();
            }
        }
    });

    // --- Flyer UI Page Management Logic ---
    function getCurrentPageCount() { return pageTabsContainer ? pageTabsContainer.querySelectorAll('.page-tab').length : 0; }

    function renumberPages() {
        if (!pageTabsContainer || !productGridArea) return;
        const allTabs = Array.from(pageTabsContainer.querySelectorAll('.page-tab'));
        const allPageContentsOriginal = Array.from(productGridArea.querySelectorAll('.page-content'));

        allTabs.forEach((tab, index) => {
            const newPageNumber = index + 1;
            const oldPageContentId = tab.dataset.targetPage;
            
            const textNode = Array.from(tab.childNodes).find(node => node.nodeType === Node.TEXT_NODE && node.nodeValue.trim().startsWith('Page'));
            if (textNode) textNode.nodeValue = ` Page ${newPageNumber}`;
            else tab.textContent = `Page ${newPageNumber}`; 

            const correspondingContent = allPageContentsOriginal.find(pc => pc.id === oldPageContentId);
            if (correspondingContent) {
                const newPageContentId = `page-${newPageNumber}-content`;
                correspondingContent.id = newPageContentId;
                tab.dataset.targetPage = newPageContentId;

                const maxSlots = (newPageNumber === 1) ? PAGE_1_MAX_SLOTS : PAGE_DEFAULT_MAX_SLOTS;
                correspondingContent.dataset.maxSlots = maxSlots;
                const counterElement = correspondingContent.querySelector('.flyerProductCounter');
                if (counterElement) {
                    const gridInPage = correspondingContent.querySelector('.grid');
                    const filledSlots = gridInPage ? gridInPage.querySelectorAll('.product-card[data-product-id]').length : 0;
                    counterElement.textContent = `Slots Filled: ${filledSlots} / ${maxSlots}`;
                }
            }
        });
        updateProductCounter(); 
    }

    function createNewPageContent(pageNumber) {
        const newPageContentId = `page-${pageNumber}-content`;
        const newPageContentDiv = document.createElement('div');
        newPageContentDiv.id = newPageContentId;
        newPageContentDiv.className = 'page-content'; 
        newPageContentDiv.style.display = 'none'; 

        const maxSlots = (pageNumber === 1) ? PAGE_1_MAX_SLOTS : PAGE_DEFAULT_MAX_SLOTS;
        newPageContentDiv.dataset.maxSlots = maxSlots;

        const gridDiv = document.createElement('div');
        gridDiv.className = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5';
        
        const addProductSlotDiv = document.createElement('div');
        addProductSlotDiv.className = 'add-product-slot border-2 border-dashed border-gray-300 hover:border-brand-blue rounded-xl p-3 flex flex-col items-center justify-center text-center cursor-pointer aspect-square hover:bg-blue-50 transition-all duration-200 group min-h-[200px]';
        const addSlotSvg = createSVGElement('svg', { class: "w-10 h-10 text-gray-400 group-hover:text-brand-blue mb-2", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" });
        addSlotSvg.appendChild(createSVGElement('path', { "stroke-linecap": "round", "stroke-linejoin": "round", "stroke-width": "2", d: "M12 6v6m0 0v6m0-6h6m-6 0H6" }));
        addProductSlotDiv.appendChild(addSlotSvg);
        const addSlotSpan = document.createElement('span'); 
        addSlotSpan.className = 'text-sm font-medium text-gray-500 group-hover:text-brand-blue'; 
        addSlotSpan.textContent = 'Add Product';
        addProductSlotDiv.appendChild(addSlotSpan);
        gridDiv.appendChild(addProductSlotDiv); 

        newPageContentDiv.appendChild(gridDiv);

        const counterPara = document.createElement('p');
        counterPara.className = 'flyerProductCounter text-xs text-gray-500 mt-3 text-right';
        counterPara.textContent = `Slots Filled: 0 / ${maxSlots}`;
        newPageContentDiv.appendChild(counterPara);
        
        return newPageContentDiv;
    }

    function addNewProductPage(isInitialCall = false) {
        if (!pageTabsContainer || !productGridArea) return;

        if (!isInitialCall && !stepCompletionStatus['store-info']) {
            showCustomConfirmModal("Please complete Store Information (Step 1) before adding new pages.", "Prerequisite Incomplete", "OK", () => {
                navigateToStep('store-info');
                storeNameInput?.focus();
            });
            return;
        }

        const newPageNumber = getCurrentPageCount() + 1;
        const newPageContentId = `page-${newPageNumber}-content`;

        const newTabButton = document.createElement('button');
        newTabButton.type = 'button';
        newTabButton.dataset.targetPage = newPageContentId;
        newTabButton.className = 'page-tab inactive-tab px-3 py-2 font-medium text-sm rounded-lg text-gray-500 hover:text-brand-blue hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:ring-opacity-50';
        newTabButton.textContent = `Page ${newPageNumber}`;
        pageTabsContainer.appendChild(newTabButton);

        const newPageContentDiv = createNewPageContent(newPageNumber);
        productGridArea.appendChild(newPageContentDiv);

        updateAddProductControlsAvailability(); 

        newTabButton.click(); 
    }
    if (addPageToolbarBtn) addPageToolbarBtn.addEventListener('click', () => addNewProductPage(false));

    function removeCurrentProductPage() {
        if (!pageTabsContainer || !productGridArea) return;
        const activeTab = pageTabsContainer.querySelector('.page-tab.active-tab');
        if (!activeTab) {
            showCustomConfirmModal("No active page selected to remove.", "Action Info", "OK", () => {});
            return;
        }
        if (getCurrentPageCount() <= 1) {
            showCustomConfirmModal("Cannot remove the last page.", "Action Info", "OK", () => {});
            return;
        }

        const activePageContent = document.getElementById(activeTab.dataset.targetPage);
        const pageNameToDelete = activeTab.textContent.trim(); 

        showCustomConfirmModal(
            `Delete "${escapeHtml(pageNameToDelete)}"? All products on this page will be removed. This cannot be undone.`,
            "Confirm Page Deletion", "Yes, Delete Page",
            () => { 
                if (activePageContent) {
                    activePageContent.querySelectorAll('.product-card[data-product-id]').forEach(card => {
                        if (card.dataset.productId) removeProductData(card.dataset.productId); 
                    });
                    activePageContent.remove(); 
                }
                const tabToRemoveIndex = Array.from(pageTabsContainer.children).indexOf(activeTab);
                activeTab.remove(); 
                
                renumberPages(); 

                const remainingTabs = pageTabsContainer.querySelectorAll('.page-tab');
                let tabToActivate = null;
                if (remainingTabs.length > 0) {
                    tabToActivate = remainingTabs[Math.min(tabToRemoveIndex, remainingTabs.length - 1)];
                }

                if (tabToActivate) {
                    tabToActivate.click();
                } else if (remainingTabs.length === 0) { 
                    addNewProductPage(true); 
                }
                updateProductCounter(); 
            }
        );
    }
    if (removePageToolbarBtn) removePageToolbarBtn.addEventListener('click', removeCurrentProductPage);

    if (pageTabsContainer) pageTabsContainer.addEventListener('click', (event) => {
        const clickedTab = event.target.closest('.page-tab');
        if (!clickedTab || clickedTab.classList.contains('active-tab')) return; 

        pageTabsContainer.querySelectorAll('.page-tab').forEach(t => {
            t.classList.remove('active-tab', 'bg-brand-blue', 'text-white', 'shadow-sm', 'font-semibold');
            t.classList.add('inactive-tab', 'text-gray-500', 'hover:text-brand-blue', 'hover:bg-gray-100', 'font-medium');
        });
        document.querySelectorAll('.page-content').forEach(content => { content.style.display = 'none'; });

        clickedTab.classList.add('active-tab', 'bg-brand-blue', 'text-white', 'shadow-sm', 'font-semibold');
        clickedTab.classList.remove('inactive-tab', 'text-gray-500', 'hover:text-brand-blue', 'hover:bg-gray-100', 'font-medium');
        const targetPageContent = document.getElementById(clickedTab.dataset.targetPage);
        if (targetPageContent) {
            targetPageContent.style.display = 'block';
            updateProductCounter(); 
        }
    });

    // --- Flyer UI Production Timeline Logic ---
    function formatDateTimeForReadiness(date) { 
        return date.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }); 
    }

     // ... (your existing script content above this function)

function initializeFlyerProductionTimeline() {
    if (countdownInterval) clearInterval(countdownInterval);

    const deadlineDate = new Date(initialSubmissionDate.getTime());
    deadlineDate.setDate(initialSubmissionDate.getDate() + FLYER_PRODUCTION_DAYS);

    // Ensure deadlineDateDisplayEl is defined (it's likely cached globally as per your structure)
    if (deadlineDateDisplayEl) {
        deadlineDateDisplayEl.textContent = formatDateTimeForReadiness(deadlineDate);
    }

    // Define display elements for individual timer parts within this function's scope
    // This makes the function more self-contained regarding these specific elements.
    // These should match the IDs in your HTML for the countdown timer segments.
    const daysEl = document.getElementById('days');
    const hoursEl = document.getElementById('hours');
    const minutesEl = document.getElementById('minutes');
    const secondsEl = document.getElementById('seconds');

    function updateTimelineDisplay() {
        const now = new Date();
        const timeLeft = deadlineDate.getTime() - now.getTime();

        if (timeLeft <= 0) {
            if (daysEl) daysEl.textContent = "00";
            if (hoursEl) hoursEl.textContent = "00";
            if (minutesEl) minutesEl.textContent = "00";
            if (secondsEl) secondsEl.textContent = "00";
            
            // Optionally, you can add a specific message or class to the parent container
            // if (countdownTimerDisplayEl) { // countdownTimerDisplayEl is the parent div
            //     countdownTimerDisplayEl.classList.add('text-brand-red', 'font-semibold');
            //     // To display "Deadline Passed" you might need another element or modify an existing one.
            // }

            if (countdownInterval) clearInterval(countdownInterval);
            countdownInterval = null;
            return;
        }

        const d = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
        const h = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const m = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((timeLeft % (1000 * 60)) / 1000);

        if (daysEl) daysEl.textContent = String(d).padStart(2, '0');
        if (hoursEl) hoursEl.textContent = String(h).padStart(2, '0');
        if (minutesEl) minutesEl.textContent = String(m).padStart(2, '0');
        if (secondsEl) secondsEl.textContent = String(s).padStart(2, '0');
    }

    // Check if at least one of the display elements exists before starting the interval
    // Also ensure the specific timer part elements are found
    if (deadlineDateDisplayEl || (daysEl && hoursEl && minutesEl && secondsEl)) {
        updateTimelineDisplay(); // Initial call to display immediately
        countdownInterval = setInterval(updateTimelineDisplay, 1000);
    } else {
        console.warn("Timeline display elements (days, hours, minutes, seconds, or deadline) not all found. Timer not started.");
    }
}


    window.addEventListener('beforeunload', () => { if (countdownInterval) clearInterval(countdownInterval); });
    document.addEventListener('visibilitychange', () => {
        if (document.hidden && countdownInterval) { clearInterval(countdownInterval); countdownInterval = null;}
        else if (!document.hidden && !countdownInterval && (deadlineDateDisplayEl || countdownTimerDisplayEl)) initializeFlyerProductionTimeline();
    });

    // --- MODIFICATION START: Enhanced Stepper Logic ---
    function createCheckmarkIconSVG() {
        const svg = createSVGElement('svg', { class: "w-5 h-5 mr-1.5 step-checkmark-icon text-brand-green", fill: "currentColor", viewBox: "0 0 20 20" });
        svg.appendChild(createSVGElement('path', { "fill-rule": "evenodd", d: "M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z", "clip-rule": "evenodd" }));
        return svg;
    }

    function updateStepperVisuals() {
        if (!stepperNav) {
            console.error("updateStepperVisuals: stepperNav not found.");
            return;
        }
        const activeStepIndex = stepOrder.indexOf(currentAppStep);
        // console.log(`updateStepperVisuals CALLED. currentAppStep: "${currentAppStep}", activeStepIndex: ${activeStepIndex}`);
        // console.log("Current stepCompletionStatus:", JSON.parse(JSON.stringify(stepCompletionStatus)));

        stepOrder.forEach((stepKey, index) => {
            const stepAnchor = stepElements[stepKey];
            if (!stepAnchor) {
                console.warn(`updateStepperVisuals: No stepAnchor found for stepKey: ${stepKey}`);
                return;
            }

            const stepNumberSpan = stepAnchor.querySelector('span:first-child');
            const stepLabelSpan = stepAnchor.querySelector('span:last-child');
            const existingCheckmark = stepAnchor.querySelector('.step-checkmark-icon');
            if (existingCheckmark) existingCheckmark.remove();

            stepAnchor.classList.remove('border-brand-blue', 'border-brand-green', 'border-gray-300', 'border-transparent', 'cursor-not-allowed', 'opacity-60', 'hover:border-gray-300');
            stepAnchor.setAttribute('aria-current', 'false');
            stepAnchor.setAttribute('aria-disabled', 'true'); 

            if (stepNumberSpan) stepNumberSpan.classList.remove('text-brand-blue', 'text-brand-green', 'text-gray-700', 'text-gray-400', 'font-bold', 'group-hover:text-gray-700');
            if (stepLabelSpan) stepLabelSpan.classList.remove('text-brand-blue', 'text-brand-green', 'text-gray-700', 'text-gray-400', 'group-hover:text-gray-700');
            
            const isActuallyCompleted = stepCompletionStatus[stepKey];
            const isCurrent = (stepKey === currentAppStep);
            
            let canBeClicked = false; 
            if (isActuallyCompleted || isCurrent) {
                canBeClicked = true;
            } else {
                let allPreviousStepsComplete = true;
                for (let i = 0; i < index; i++) {
                    if (!stepCompletionStatus[stepOrder[i]]) {
                        allPreviousStepsComplete = false;
                        break;
                    }
                }
                if (allPreviousStepsComplete) {
                    canBeClicked = true; 
                }
            }

            if (isActuallyCompleted && !isCurrent) { 
                stepAnchor.classList.add('border-brand-green');
                if (stepNumberSpan) {
                    stepNumberSpan.classList.add('text-brand-green', 'font-medium');
                    stepAnchor.insertBefore(createCheckmarkIconSVG(), stepNumberSpan);
                }
                if (stepLabelSpan) stepLabelSpan.classList.add('text-brand-green', 'font-medium');
                if(canBeClicked) {
                    stepAnchor.classList.add('hover:border-gray-300'); // Keep hover for completed
                    stepAnchor.setAttribute('aria-disabled', 'false');
                }
            } else if (isCurrent) { 
                stepAnchor.classList.add('border-brand-blue');
                stepAnchor.setAttribute('aria-current', 'step');
                if (stepNumberSpan) stepNumberSpan.classList.add('text-brand-blue', 'font-bold');
                if (stepLabelSpan) stepLabelSpan.classList.add('text-brand-blue', 'font-medium');
                stepAnchor.setAttribute('aria-disabled', 'false');
            } else if (canBeClicked) { 
                stepAnchor.classList.add('border-transparent', 'hover:border-gray-300');
                if (stepNumberSpan) stepNumberSpan.classList.add('text-gray-400', 'group-hover:text-gray-700', 'font-medium');
                if (stepLabelSpan) stepLabelSpan.classList.add('text-gray-400', 'group-hover:text-gray-700', 'font-medium');
                stepAnchor.setAttribute('aria-disabled', 'false');
            } else { 
                stepAnchor.classList.add('border-transparent', 'cursor-not-allowed', 'opacity-60');
                if (stepNumberSpan) stepNumberSpan.classList.add('text-gray-400', 'font-medium');
                if (stepLabelSpan) stepLabelSpan.classList.add('text-gray-400', 'font-medium');
            }
        });
    }

    function makeStepClickable(stepAnchorElement, stepKey) {
        const newStepAnchor = stepAnchorElement.cloneNode(true);
        stepAnchorElement.parentNode.replaceChild(newStepAnchor, stepAnchorElement);
        stepElements[stepKey] = newStepAnchor; 

        newStepAnchor.addEventListener('click', (e) => {
            e.preventDefault();
            const targetStepKey = stepKey;
            const targetStepIndex = stepOrder.indexOf(targetStepKey);

            let canNavigate = false;
            if (stepCompletionStatus[targetStepKey] || targetStepKey === currentAppStep) {
                canNavigate = true;
            } else {
                let allPreviousStepsComplete = true;
                for (let i = 0; i < targetStepIndex; i++) {
                    if (!stepCompletionStatus[stepOrder[i]]) {
                        allPreviousStepsComplete = false;
                        break;
                    }
                }
                if (allPreviousStepsComplete) {
                    canNavigate = true;
                }
            }

            if (canNavigate) {
                if (targetStepKey === 'review') {
                    handleReviewAndSubmit(); 
                } else {
                    navigateToStep(targetStepKey);
                }
            } else {
                let firstUncompletedPrerequisiteKey = null;
                for (let i = 0; i < targetStepIndex; i++) {
                    if (!stepCompletionStatus[stepOrder[i]]) {
                        firstUncompletedPrerequisiteKey = stepOrder[i];
                        break;
                    }
                }
                if (firstUncompletedPrerequisiteKey) {
                    const prevStepName = stepElements[firstUncompletedPrerequisiteKey]?.querySelector('span:last-child')?.textContent || `Step ${stepOrder.indexOf(firstUncompletedPrerequisiteKey) + 1}`;
                    const targetStepName = stepElements[targetStepKey]?.querySelector('span:last-child')?.textContent || 'this step';
                    showCustomConfirmModal(
                        `Please complete "${prevStepName}" using its 'Next Step' button before proceeding to "${targetStepName}".`, 
                        "Prerequisite Incomplete", 
                        "OK",
                        () => {
                            navigateToStep(firstUncompletedPrerequisiteKey);
                            if (firstUncompletedPrerequisiteKey === 'store-info') {
                                nextStepStoreInfoBtn?.focus();
                            } else if (firstUncompletedPrerequisiteKey === 'add-products') {
                                nextStepAddProductsBtn?.focus();
                            }
                        }
                    );
                } else {
                    showCustomConfirmModal("Please complete the previous steps sequentially using the 'Next Step' buttons.", "Step Locked", "OK", () => {});
                }
            }
        });
    }

    function highlightActiveSection(stepKey) {
        [storeInfoSectionWrapper, addProductsSectionWrapper, socialPrintSectionWrapper, reviewSection].forEach(wrapper => {
            if (wrapper) {
                wrapper.classList.remove(...ACTIVE_SECTION_HIGHLIGHT_CLASSES);
            }
        });

        let targetWrapper = null;
        switch (stepKey) {
            case 'store-info': targetWrapper = storeInfoSectionWrapper; break;
            case 'add-products': targetWrapper = addProductsSectionWrapper; break;
            case 'social-print': targetWrapper = socialPrintSectionWrapper; break;
            case 'review': targetWrapper = reviewSection; break;
        }
        if (targetWrapper) {
            targetWrapper.classList.add(...ACTIVE_SECTION_HIGHLIGHT_CLASSES);
            if (targetWrapper !== reviewSection && targetWrapper.closest('aside, main')) { 
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }
    }

    function navigateToStep(targetStepKey) {
        // console.log(`Navigating to step: ${targetStepKey}. Current completion:`, JSON.parse(JSON.stringify(stepCompletionStatus)));
        
        const targetIndex = stepOrder.indexOf(targetStepKey);
        for (let i = 0; i < targetIndex; i++) {
            if (!stepCompletionStatus[stepOrder[i]]) {
                // console.warn(`Attempted to navigate to ${targetStepKey} but prerequisite ${stepOrder[i]} is not complete.`);
                // This case should ideally be caught by makeStepClickable or button handlers
                return; 
            }
        }

        currentAppStep = targetStepKey;
        if (targetStepKey !== 'review') {
            lastActiveStepBeforeReview = targetStepKey; 
        }
        
        if (targetStepKey === 'store-info') {
            stepCompletionStatus['add-products'] = false;
            stepCompletionStatus['social-print'] = false;
            stepCompletionStatus['review'] = false;
        } else if (targetStepKey === 'add-products') {
            stepCompletionStatus['social-print'] = false;
            stepCompletionStatus['review'] = false;
        } else if (targetStepKey === 'social-print') {
            stepCompletionStatus['review'] = false;
        }


        if (targetStepKey === 'review') {
            if (mainLayoutColumns) mainLayoutColumns.style.display = 'none';
            if (reviewSection) reviewSection.style.display = 'block';
            if (reviewSectionTitle) reviewSectionTitle.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
            if (mainLayoutColumns) mainLayoutColumns.style.display = 'grid'; 
            if (reviewSection) reviewSection.style.display = 'none';
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        updateNextButtonVisibility();
        updateStepperVisuals(); 
        highlightActiveSection(targetStepKey);
    }
    // --- MODIFICATION END: Enhanced Stepper Logic ---

    // --- Flyer UI Social Media & Print Requests Logic ---
    function renderSocialSelectionsDisplay() {
        if (!socialCounterDisplay || !socialSelectedBadgesContainer) return;
        if(socialEligibleProductsList) socialEligibleProductsList.innerHTML = ''; 
        socialSelectedBadgesContainer.innerHTML = ''; 

        let socialProductsCount = 0;
        const productsForSocial = [];
        productDataStore.forEach(product => {
            if (product.includeInSocial) {
                productsForSocial.push(product);
                socialProductsCount++;
            }
        });

        if (socialCounterDisplay) {
            socialCounterDisplay.textContent = `${socialProductsCount}/${MAX_SOCIAL_PRODUCTS} selected`;
            if (socialProductsCount > MAX_SOCIAL_PRODUCTS) {
                socialCounterDisplay.classList.add('text-brand-red', 'font-semibold');
            } else {
                socialCounterDisplay.classList.remove('text-brand-red', 'font-semibold');
            }
        }

        if (productsForSocial.length === 0) {
            socialSelectedBadgesContainer.innerHTML = '<p class="text-xs text-gray-400 italic self-center">No products marked for social media yet.</p>';
            if(socialEligibleProductsList) socialEligibleProductsList.innerHTML = '<p class="text-xs text-gray-400 italic">Mark products for social media in the product form.</p>';
        } else {
            productsForSocial.forEach(product => {
                const badge = document.createElement('span');
                badge.className = 'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-brand-blue shadow-sm';
                badge.textContent = escapeHtml(product.name);
                socialSelectedBadgesContainer.appendChild(badge);
            });
        }
    }
    function handlePrintMaterialChange() {
        if (reqPriceTagsCheckbox) printMaterialSelections.priceTags = reqPriceTagsCheckbox.checked;
        if (reqPostersCheckbox) printMaterialSelections.posters = reqPostersCheckbox.checked;
        if (reqBannersCheckbox) printMaterialSelections.banners = reqBannersCheckbox.checked;
        if (printNotesTextarea) printMaterialSelections.notes = printNotesTextarea.value;
    }
    if (reqPriceTagsCheckbox) reqPriceTagsCheckbox.addEventListener('change', handlePrintMaterialChange);
    if (reqPostersCheckbox) reqPostersCheckbox.addEventListener('change', handlePrintMaterialChange);
    if (reqBannersCheckbox) reqBannersCheckbox.addEventListener('change', handlePrintMaterialChange);
    if (printNotesTextarea) printNotesTextarea.addEventListener('input', handlePrintMaterialChange);

    // --- Flyer UI Review Section Population ---
    function populateReviewStoreInfo(storeInfo) {
        if(reviewStoreName) reviewStoreName.textContent = storeInfo.storeName || 'N/A';
        if(reviewSubmittedBy) reviewSubmittedBy.textContent = storeInfo.submittedBy || 'N/A';
        if(reviewStartDate) reviewStartDate.textContent = storeInfo.startDate ? new Date(storeInfo.startDate + 'T00:00:00').toLocaleDateString() : 'N/A'; 
        if(reviewEndDate) reviewEndDate.textContent = storeInfo.endDate ? new Date(storeInfo.endDate + 'T00:00:00').toLocaleDateString() : 'N/A';
        if(reviewNotes) reviewNotes.textContent = storeInfo.notes || 'No notes provided.';
        if(reviewCanadaPostFlyer) reviewCanadaPostFlyer.textContent = storeInfo.canadaPostFlyer ? 'Yes' : 'No';
        if(reviewDigitalFlyer) reviewDigitalFlyer.textContent = storeInfo.digitalFlyer ? 'Yes' : 'No';
    }
    function populateReviewProductPages(pagesData) {
        if (!reviewProductPagesContainer) return;
        reviewProductPagesContainer.innerHTML = ''; 
        if (pagesData.length === 0) {
            reviewProductPagesContainer.innerHTML = '<p class="text-gray-500 italic">No products added to any pages.</p>';
            return;
        }

        pagesData.forEach(page => {
            const pageDiv = document.createElement('div');
            pageDiv.className = 'mb-6 border-b border-gray-200 pb-4';
            const pageTitle = document.createElement('h4');
            pageTitle.className = 'text-lg font-semibold text-brand-blue mb-3';
            pageTitle.textContent = `Page ${page.pageNumber}`;
            pageDiv.appendChild(pageTitle);

            if (page.products.length === 0) {
                pageDiv.innerHTML += '<p class="text-sm text-gray-500 italic">No products on this page.</p>';
            } else {
                const productListUl = document.createElement('ul');
                productListUl.className = 'space-y-3';
                page.products.forEach(product => {
                    const listItem = document.createElement('li');
                    listItem.className = 'p-3 border border-gray-200 rounded-lg bg-white text-sm shadow-sm';
                    
                    let productHtml = `<strong class="block text-gray-800">${escapeHtml(product.name || 'Unnamed Product')}</strong>`;
                    if (product.brand) productHtml += `<span class="text-xs text-gray-500 block">Brand: ${escapeHtml(product.brand)}</span>`;
                    if (product.sku) productHtml += `<span class="text-xs text-gray-500 block">SKU: ${escapeHtml(product.sku)}</span>`;

                    const regularPriceNumRev = parseFloat(product.regularPrice);
                    const salePriceNumRev = parseFloat(product.salePrice);
                    const manualDesc = product.manualDiscountDescription?.trim();

                    if (manualDesc && (isNaN(regularPriceNumRev) || regularPriceNumRev === 0) && (isNaN(salePriceNumRev) || salePriceNumRev === 0)) {
                        let displayManualDesc = escapeHtml(manualDesc);
                        if (!isNaN(parseFloat(manualDesc)) && !manualDesc.includes('%')) { 
                            displayManualDesc = `${escapeHtml(manualDesc)}% OFF`;
                        }
                        productHtml += `<span class="text-sm font-semibold text-brand-red block mt-1">${displayManualDesc}</span>`;
                    } else if (!isNaN(salePriceNumRev) && !isNaN(regularPriceNumRev) && salePriceNumRev < regularPriceNumRev && regularPriceNumRev > 0) {
                        productHtml += `<span class="text-sm text-gray-500 block mt-1">Regular: <del>$${regularPriceNumRev.toFixed(2)}</del></span>`;
                        productHtml += `<span class="text-sm font-semibold text-brand-red block">Sale: $${salePriceNumRev.toFixed(2)}</span>`;
                        const percentageOffRev = Math.round(((regularPriceNumRev - salePriceNumRev) / regularPriceNumRev) * 100);
                        productHtml += `<span class="text-xs text-white bg-brand-red px-1.5 py-0.5 rounded-full ml-1 font-semibold">${percentageOffRev}% OFF</span>`;
                    } else if (!isNaN(regularPriceNumRev) && regularPriceNumRev > 0) {
                        productHtml += `<span class="text-sm font-semibold text-gray-800 block mt-1">Price: $${regularPriceNumRev.toFixed(2)}</span>`;
                    } else {
                        productHtml += `<span class="text-sm font-semibold text-gray-800 block mt-1">Price: $0.00</span>`; 
                    }

                    if (product.description) productHtml += `<p class="text-xs text-gray-600 mt-1">${escapeHtml(product.description)}</p>`;
                    listItem.innerHTML = productHtml;
                    productListUl.appendChild(listItem);
                });
                pageDiv.appendChild(productListUl);
            }
            reviewProductPagesContainer.appendChild(pageDiv);
        });
    }

    function populateReviewSocialMedia() {
        if (!reviewSocialMediaList) return; 
        reviewSocialMediaList.innerHTML = ''; 
        const socialProducts = Array.from(productDataStore.values()).filter(p => p.includeInSocial);
        if (socialProducts.length === 0) {
            reviewSocialMediaList.innerHTML = '<p class="text-gray-500 italic">No products selected for social media.</p>';
            return;
        }
        const ul = document.createElement('ul'); 
        ul.className = 'list-disc list-inside space-y-1 text-sm text-gray-700';
        socialProducts.forEach(product => { 
            const li = document.createElement('li'); 
            li.textContent = escapeHtml(product.name); 
            ul.appendChild(li); 
        });
        reviewSocialMediaList.appendChild(ul);
    }

    function populateReviewPrintRequests(printRequests) {
        if(reviewReqPriceTags) reviewReqPriceTags.textContent = printRequests.priceTags ? 'Yes' : 'No';
        if(reviewReqPosters) reviewReqPosters.textContent = printRequests.posters ? 'Yes' : 'No';
        if(reviewReqBanners) reviewReqBanners.textContent = printRequests.banners ? 'Yes' : 'No';
        if(reviewPrintNotes) reviewPrintNotes.textContent = printRequests.notes || 'No additional notes.';
    }

    function getAllProductsByPage() {
        const pagesData = [];
        if (!productGridArea || !pageTabsContainer) return pagesData;

        const pageTabs = Array.from(pageTabsContainer.querySelectorAll('.page-tab'));
        pageTabs.forEach((tab, index) => {
            const pageContentId = tab.dataset.targetPage;
            const pageContent = document.getElementById(pageContentId);
            const pageNumber = index + 1; 
            const productsOnThisPage = [];
            if (pageContent) {
                pageContent.querySelectorAll('.product-card[data-product-id]').forEach(card => {
                    const product = getProductDataById(card.dataset.productId);
                    if (product) productsOnThisPage.push(product);
                });
            }
            pagesData.push({ pageNumber, products: productsOnThisPage });
        });
        return pagesData;
    }

    // --- MODIFICATION START: Updated handleReviewAndSubmit for Stepper Logic ---
    function handleReviewAndSubmit() {
        if (!checkStoreInfoCompletion()) {
            showCustomConfirmModal("Please complete Store Information (Step 1) before proceeding to review.", "Prerequisite Incomplete", "OK", () => {
                navigateToStep('store-info'); 
                const firstInvalidField = storeInfoForm?.querySelector(`.${ERROR_BORDER_CLASS}, input:invalid, select:invalid, textarea:invalid`);
                firstInvalidField?.focus();
            });
            return; 
        }
        if (!checkAddProductsCompletion()) {
            showCustomConfirmModal("Please add at least one product (Step 2) before proceeding to review.", "Prerequisite Incomplete", "OK", () => {
                navigateToStep('add-products'); 
                const activePageAddSlot = document.querySelector('.page-content:not([style*="display: none"]) .add-product-slot:not(.disabled-slot)');
                activePageAddSlot?.focus();
            });
            return; 
        }

        stepCompletionStatus['social-print'] = true; 
        updateStepperVisuals(); // Update visuals as social-print is now considered complete

        const storeInfo = {
            storeName: storeNameInput?.value, 
            submittedBy: submittedByInput?.value,
            startDate: startDateInput?.value, 
            endDate: endDateInput?.value,
            notes: notesTextarea?.value,
            canadaPostFlyer: toggleCanadaPostFlyer ? toggleCanadaPostFlyer.checked : false,
            digitalFlyer: toggleDigitalFlyer ? toggleDigitalFlyer.checked : false
        };
        populateReviewStoreInfo(storeInfo);
        populateReviewProductPages(getAllProductsByPage());
        populateReviewSocialMedia();
        populateReviewPrintRequests(printMaterialSelections);

        stepCompletionStatus['review'] = true; 
        navigateToStep('review');
    }
    // --- MODIFICATION END ---

    function resetAppForNewFlyer() {
        productDataStore.clear();
        nextProductId = 1;
        printMaterialSelections = { priceTags: false, posters: false, banners: false, notes: "" };

        if (storeInfoForm) storeInfoForm.reset(); 
        if (toggleCanadaPostFlyer) toggleCanadaPostFlyer.checked = false;
        if (toggleDigitalFlyer) toggleDigitalFlyer.checked = false; 
        if (printNotesTextarea) printNotesTextarea.value = "";
        if (reqPriceTagsCheckbox) reqPriceTagsCheckbox.checked = false;
        if (reqPostersCheckbox) reqPostersCheckbox.checked = false;
        if (reqBannersCheckbox) reqBannersCheckbox.checked = false;

        if (productGridArea) productGridArea.innerHTML = '';
        if (pageTabsContainer) pageTabsContainer.innerHTML = '';
        addNewProductPage(true); 

        for (const step in stepCompletionStatus) {
            stepCompletionStatus[step] = false;
        }
        
        navigateToStep('store-info'); 
        checkStoreInfoCompletion(); 
        checkAddProductsCompletion(); 
        
        renderSocialSelectionsDisplay();
        setButtonEnabled(finalSubmitBtn, true); 
        setButtonEnabled(editSubmissionBtn, true); 
        
        console.log("Application reset for new flyer.");
    }

    // --- ADMIN PANEL LOGIC ---
    async function handleAdminLogin(event) {
        event.preventDefault();
        if (!adminUsernameInput || !adminPasswordInput || !adminLoginErrorDiv || !adminLoginDiv || !adminDashboardDiv) {
            console.error("Admin login elements missing in handleAdminLogin"); return;
        }

        const username = adminUsernameInput.value;
        const password = adminPasswordInput.value;
        adminLoginErrorDiv.textContent = '';
        adminLoginErrorDiv.style.display = 'none';

        if (!username || !password) {
            adminLoginErrorDiv.textContent = 'Username and password are required.';
            adminLoginErrorDiv.style.display = 'block';
            return;
        }

        try {
            const response = await fetch('/api/admin/login', { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });
            
            let result;
            const responseText = await response.text();
            try {
                result = JSON.parse(responseText);
            } catch (e) {
                console.error("Admin Login: Failed to parse server response as JSON.", responseText);
                adminLoginErrorDiv.textContent = `Login failed: Server returned an unexpected response. Status: ${response.status}. Response: ${responseText.substring(0, 100)}`;
                adminLoginErrorDiv.style.display = 'block';
                adminPasswordInput.value = '';
                return;
            }

            if (response.ok && result.token) {
                sessionStorage.setItem('adminToken', result.token);
                if (result.adminName && adminGreetingElement) { 
                    sessionStorage.setItem('adminUsernameDisplay', result.adminName);
                    adminGreetingElement.textContent = `What's a beautiful day, ${escapeHtml(result.adminName)}, eh?`;
                } else if (adminGreetingElement) {
                    adminGreetingElement.textContent = `What's a beautiful day, Admin, eh?`;
                }
                
                adminLoginDiv.style.display = 'none';
                adminDashboardDiv.style.display = 'block';
                adminPasswordInput.value = ''; 
                loadAdminSubmissions();
            } else {
                adminLoginErrorDiv.textContent = result.message || 'Login failed. Please try again.';
                adminLoginErrorDiv.style.display = 'block';
                adminPasswordInput.value = '';
            }
        } catch (error) {
            console.error('Admin Login Network Error:', error);
            adminLoginErrorDiv.textContent = 'A network error occurred. Please try again later.';
            adminLoginErrorDiv.style.display = 'block';
            adminPasswordInput.value = '';
        }
    }

    function handleAdminLogout() {
        sessionStorage.removeItem('adminToken');
        sessionStorage.removeItem('adminUsernameDisplay'); 

        if (adminSection) adminSection.style.display = 'none';
        if (flyerSubmissionFormContainer) flyerSubmissionFormContainer.style.display = 'block'; 
        
        if (adminUsernameInput) adminUsernameInput.value = '';
        if (adminPasswordInput) adminPasswordInput.value = '';
        if (adminLoginErrorDiv) { adminLoginErrorDiv.textContent = ''; adminLoginErrorDiv.style.display = 'none'; }
        if (adminGreetingElement) adminGreetingElement.textContent = 'Admin Dashboard'; 
        if (adminSubmissionsListDiv) adminSubmissionsListDiv.innerHTML = '<p class="text-brand-medium-gray p-4">Loading submissions...</p>';
        if (filterDateStartInput) filterDateStartInput.value = '';
        if (filterDateEndInput) filterDateEndInput.value = '';
        if (filterStoreNameInput) filterStoreNameInput.value = '';
        selectedSubmissionIds.clear();
        updateDeleteButtonState();

        const mainAppNav = document.getElementById('mainAppNavigation');
        if(mainAppNav) mainAppNav.style.display = 'flex';
        if(showAdminLoginBtn) showAdminLoginBtn.style.display = 'block'; 

        console.log("Admin logged out.");
    }


    async function loadAdminSubmissions() {
        console.log('loadAdminSubmissions: adminSelectedActionsContainer is:', adminSelectedActionsContainer); 
        if (!adminSubmissionsListDiv) {
            console.error("adminSubmissionsListDiv not found in loadAdminSubmissions");
            return;
        }
        const token = sessionStorage.getItem('adminToken');
        if (!token) {
            adminSubmissionsListDiv.innerHTML = '<p class="text-brand-red p-4">Session expired. Please log in again.</p>';
            if (typeof handleAdminLogout === "function") handleAdminLogout();
            return;
        }
        adminSubmissionsListDiv.innerHTML = '<p class="text-brand-medium-gray p-4">Loading submissions...</p>';

        const params = new URLSearchParams();
        if (filterDateStartInput?.value) params.append('dateStart', filterDateStartInput.value);
        if (filterDateEndInput?.value) params.append('dateEnd', filterDateEndInput.value);
        if (filterStoreNameInput?.value.trim()) params.append('storeName', filterStoreNameInput.value.trim());
        
        const queryString = params.toString();
        const fetchUrl = `/api/admin/submissions${queryString ? '?' + queryString : ''}`; 
        console.log("Fetching admin submissions from:", fetchUrl);

        try {
            const response = await fetch(fetchUrl, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.ok) { 
                const submissions = await response.json();
                displaySubmissions(submissions);
            } else if (response.status === 401 || response.status === 403) { 
                sessionStorage.removeItem('adminToken');
                adminSubmissionsListDiv.innerHTML = '<p class="text-brand-red p-4">Session expired or unauthorized. Please log in again.</p>';
                if (typeof handleAdminLogout === "function") handleAdminLogout();
            } else {
                const errorText = await response.text(); 
                adminSubmissionsListDiv.innerHTML = `<p class="text-brand-red p-4">Error loading submissions: ${response.status} ${escapeHtml(errorText)}</p>`;
            }
        } catch (error) {
            console.error('Network error fetching submissions:', error);
            adminSubmissionsListDiv.innerHTML = '<p class="text-brand-red p-4">Network error fetching submissions. Please try again.</p>';
        }
    }

    function displaySubmissions(submissionsToDisplay) {
        if (!adminSubmissionsListDiv) {
            console.error("adminSubmissionsListDiv not found in displaySubmissions");
            return;
        }
        adminSubmissionsListDiv.innerHTML = ''; 
        selectedSubmissionIds.clear();
        updateDeleteButtonState(); 

        if (!submissionsToDisplay || submissionsToDisplay.length === 0) {
            adminSubmissionsListDiv.innerHTML = '<p class="text-brand-medium-gray p-4 text-center">No submissions found matching your criteria.</p>';
            return;
        }

        const table = document.createElement('table');
        table.className = 'min-w-full divide-y divide-brand-neutral-border';

        const thead = table.createTHead();
        thead.className = 'bg-gray-50'; 
        const headerRow = thead.insertRow();
        
        const thSelect = document.createElement('th');
        thSelect.scope = 'col';
        thSelect.className = 'relative px-4 sm:w-12 sm:px-6 py-3.5 text-left text-xs font-semibold text-brand-dark-gray'; 
        
        const selectAllCheckbox = document.createElement('input');
        selectAllCheckbox.type = 'checkbox';
        selectAllCheckbox.className = 'absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300 text-brand-blue focus:ring-brand-blue sm:left-6';
        selectAllCheckbox.title = 'Select/Deselect All';
        selectAllCheckbox.setAttribute('aria-label', 'Select all submissions'); 

        thSelect.appendChild(selectAllCheckbox);
        headerRow.appendChild(thSelect);

        if (selectAllCheckbox && adminSubmissionsListDiv) { 
            selectAllCheckbox.addEventListener('change', (event) => {
                const target = event.target; 
                const isChecked = target.checked;
                console.log(`Select All Clicked. Is Checked: ${isChecked}`);

                const rowCheckboxes = adminSubmissionsListDiv.querySelectorAll('.submission-select-checkbox');
                console.log(`Found ${rowCheckboxes.length} individual submission checkboxes.`);

                rowCheckboxes.forEach(checkboxElement => {
                    const checkbox = checkboxElement; 
                    checkbox.checked = isChecked;
                    const subId = checkbox.dataset.submissionId;

                    console.log(`  Processing checkbox for ID ${subId}. Is now checked: ${isChecked}`);
                    if (isChecked && subId) {
                        selectedSubmissionIds.add(subId);
                    } else if (subId) {
                        selectedSubmissionIds.delete(subId);
                    }
                });
                console.log('Selected IDs after Select All:', Array.from(selectedSubmissionIds));
                updateDeleteButtonState();
            });
        } else {
            if (!selectAllCheckbox) console.error("Debug: selectAllCheckbox element not found in displaySubmissions during event listener setup.");
            if (!adminSubmissionsListDiv) console.error("Debug: adminSubmissionsListDiv element not found in displaySubmissions during event listener setup.");
        }

        const headers = ['ID', 'Submitted At', 'Flyer Start', 'Store', 'Submitter', 'Product Count', 'Details'];
        headers.forEach(text => {
            const th = document.createElement('th');
            th.scope = 'col';
            th.className = 'px-3 py-3.5 text-left text-xs font-semibold text-brand-dark-gray';
            th.textContent = text;
            headerRow.appendChild(th);
        });

        const tbody = table.createTBody();
        tbody.className = 'divide-y divide-gray-200 bg-white';

        submissionsToDisplay.forEach(submission => {
            const row = tbody.insertRow();
            row.setAttribute('data-submission-id', String(submission.id));

            const cellSelect = row.insertCell();
            cellSelect.className = 'relative px-4 sm:w-12 sm:px-6'; 
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'submission-select-checkbox absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300 text-brand-blue focus:ring-brand-blue sm:left-6';
            checkbox.dataset.submissionId = String(submission.id);
            checkbox.setAttribute('aria-label', `Select submission ID ${submission.id}`); 
            checkbox.checked = selectedSubmissionIds.has(String(submission.id));
            
            checkbox.addEventListener('change', (event) => {
                const target = event.target; 
                const subId = String(submission.id);
                console.log(`Checkbox for ID ${subId} Clicked. Is Checked: ${target.checked}`);
                if (target.checked) {
                    selectedSubmissionIds.add(subId);
                } else {
                    selectedSubmissionIds.delete(subId);
                }
                console.log('Selected IDs:', Array.from(selectedSubmissionIds));
                updateDeleteButtonState();
            });
            cellSelect.appendChild(checkbox);

            const idCell = row.insertCell();
            idCell.className = 'whitespace-nowrap px-3 py-4 text-xs text-brand-medium-gray font-mono';
            idCell.textContent = submission.id || 'N/A';

            row.insertCell().textContent = submission.submitted_at ? formatDateTime(submission.submitted_at) : 'N/A';
            row.cells[row.cells.length -1].className = 'whitespace-nowrap px-3 py-4 text-xs text-brand-medium-gray';
            
            row.insertCell().textContent = submission.flyer_start_date ? formatDate(submission.flyer_start_date) : 'N/A';
            row.cells[row.cells.length -1].className = 'whitespace-nowrap px-3 py-4 text-xs text-brand-medium-gray';
            
            row.insertCell().textContent = submission.store_name || 'N/A';
            row.cells[row.cells.length -1].className = 'whitespace-nowrap px-3 py-4 text-xs text-brand-medium-gray';

            row.insertCell().textContent = submission.submitted_by || 'N/A';
            row.cells[row.cells.length -1].className = 'whitespace-nowrap px-3 py-4 text-xs text-brand-medium-gray';
            
            const cellProducts = row.insertCell();
            cellProducts.className = 'whitespace-nowrap px-3 py-4 text-xs text-brand-medium-gray text-center';
            cellProducts.textContent = (typeof submission.product_count === 'number') ? `${submission.product_count}` : 'N/A';
            
            const cellDetails = row.insertCell();
            cellDetails.className = 'whitespace-nowrap px-3 py-4 text-xs text-center';
            const viewDetailsLink = document.createElement('a');
            viewDetailsLink.href = '#';
            viewDetailsLink.className = 'text-brand-blue hover:text-brand-red hover:underline';
            viewDetailsLink.textContent = 'View';
            viewDetailsLink.dataset.submissionId = String(submission.id); 
            cellDetails.appendChild(viewDetailsLink);
        });
        adminSubmissionsListDiv.appendChild(table);
    }

    async function fetchAndDisplaySingleSubmission(submissionId) {
        if (!submissionId) return;
        console.log(`Fetching details for submission ID: ${submissionId}`);
        if (!submissionDetailModal || !submissionDetailContentDiv) {
            // Using custom modal for user feedback instead of alert
            showCustomConfirmModal("Error: Submission detail modal elements not found in the page.", "Display Error", "OK", () => {});
            return;
        }

        submissionDetailContentDiv.innerHTML = '<p class="text-brand-medium-gray p-4">Loading details...</p>';
        submissionDetailModal.classList.remove('opacity-0', 'pointer-events-none');
        submissionDetailModal.setAttribute('aria-hidden', 'false');
        const modalDialog = submissionDetailModal.querySelector('.bg-brand-neutral-bg'); // Assuming this is the main dialog container
        requestAnimationFrame(() => {
            if (modalDialog) modalDialog.classList.remove('scale-95', 'opacity-0');
        });
        if (submissionDetailModalTitleDOM) submissionDetailModalTitleDOM.focus(); // Focus modal title for accessibility

        const token = sessionStorage.getItem('adminToken');
        if (!token) {
            submissionDetailContentDiv.innerHTML = '<p class="text-brand-red p-4">Admin session expired. Please log in again.</p>';
            setTimeout(() => {
                closeSubmissionDetailModal();
                if (typeof handleAdminLogout === "function") handleAdminLogout();
            }, 2500);
            return;
        }

        try {
            const response = await fetch(`/api/admin/submission/${submissionId}`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const submissionData = await response.json();
                showSubmissionDetailModalContent(submissionData); 
            } else if (response.status === 404) {
                submissionDetailContentDiv.innerHTML = `<p class="text-brand-red p-4">Error: Submission ${escapeHtml(submissionId)} not found.</p>`;
            } else if (response.status === 401 || response.status === 403) {
                sessionStorage.removeItem('adminToken');
                submissionDetailContentDiv.innerHTML = '<p class="text-brand-red p-4">Session expired or unauthorized. Please log in again.</p>';
                setTimeout(() => {
                    closeSubmissionDetailModal();
                    if (typeof handleAdminLogout === "function") handleAdminLogout();
                }, 2500);
            } else {
                const errorResult = await response.text();
                submissionDetailContentDiv.innerHTML = `<p class="text-brand-red p-4">Error: ${response.statusText} - ${escapeHtml(errorResult)}</p>`;
            }
        } catch (error) {
            console.error('Network error fetching submission detail:', error);
            submissionDetailContentDiv.innerHTML = '<p class="text-brand-red p-4">A network error occurred while fetching submission details.</p>';
        }
    }

    /**
     * Displays the content within the submission detail modal.
     * Handles products grouped by page or as a flat list.
     */
    function showSubmissionDetailModalContent(submissionData) {
        if (!submissionDetailContentDiv || !submissionDetailModalTitleDOM) {
            console.error("Submission detail modal content or title element not found.");
            return;
        }
        submissionDetailContentDiv.innerHTML = ''; 
        const submissionId = submissionData?.id || 'N/A';
        submissionDetailModalTitleDOM.textContent = `Submission Details (ID: ${escapeHtml(submissionId)})`;

        const formData = submissionData?.form_data || {};
        const submittedAt = submissionData?.submitted_at ? formatDateTime(submissionData.submitted_at) : 'N/A';

        if (extractPdfBtn) {
            if (submissionId && submissionId !== 'N/A') {
                extractPdfBtn.dataset.submissionId = submissionId;
                extractPdfBtn.disabled = false;
                extractPdfBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            } else {
                extractPdfBtn.removeAttribute('data-submission-id');
                extractPdfBtn.disabled = true;
                extractPdfBtn.classList.add('opacity-50', 'cursor-not-allowed');
            }
        }

        const layoutDiv = document.createElement('div');
        layoutDiv.className = 'grid grid-cols-1 md:grid-cols-3 gap-4';

        const col1 = document.createElement('div');
        col1.className = 'md:col-span-1 bg-white p-4 rounded-lg shadow space-y-4';
        col1.innerHTML = `
            <div class="submission-meta">
                <h3 class="text-md font-semibold text-brand-blue mb-2">Submission Info</h3>
                <p><strong>ID:</strong> <span class="font-mono text-xs">${escapeHtml(submissionId)}</span></p>
                <p><strong>Submitted At:</strong> ${escapeHtml(submittedAt)}</p>
                <hr class="my-2 border-brand-neutral-border">
                <p><strong>Store Name:</strong> ${escapeHtml(formData.storeName || 'N/A')}</p>
                <p><strong>Submitted By:</strong> ${escapeHtml(formData.submittedBy || 'N/A')}</p>
                <hr class="my-2 border-brand-neutral-border">
                <p><strong>Flyer Start:</strong> ${escapeHtml(formData.flyerValidStartDate ? formatDate(formData.flyerValidStartDate) : 'N/A')}</p>
                <p><strong>Flyer End:</strong> ${escapeHtml(formData.flyerValidEndDate ? formatDate(formData.flyerValidEndDate) : 'N/A')}</p>
                <hr class="my-2 border-brand-neutral-border">
                <p><strong>Canada Post:</strong> ${formData.canadaPostFlyer ? 'Yes' : 'No'}</p>
                <p><strong>Digital/In-Store:</strong> ${formData.digitalInStoreFlyer || formData.digitalFlyer ? 'Yes' : 'No'}</p> 
            </div>
            <div class="submission-notes">
                <h3 class="text-md font-semibold text-brand-blue mb-2 mt-3">General Notes</h3>
                <pre class="text-xs bg-gray-50 p-2 rounded border border-gray-200 whitespace-pre-wrap font-sans">${escapeHtml(formData.generalNotes || formData.notes) || 'No general notes provided.'}</pre>
            </div>`;
        layoutDiv.appendChild(col1);

        const col2 = document.createElement('div');
        col2.className = 'md:col-span-1 bg-white p-4 rounded-lg shadow space-y-3';
        const productsSectionTitle = document.createElement('h3');
        productsSectionTitle.className = 'text-md font-semibold text-brand-blue mb-2';
        col2.appendChild(productsSectionTitle);

        const productsContainerDiv = document.createElement('div');
        productsContainerDiv.className = 'space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-1';

        const productsByPageData = formData.productsByPage;

        if (Array.isArray(productsByPageData) && productsByPageData.length > 0) {
            productsSectionTitle.textContent = 'Products by Page';
            productsByPageData.forEach(pageData => {
                const pageDiv = document.createElement('div');
                pageDiv.className = 'mb-3 pt-2 border-t border-gray-100 first:border-t-0 first:pt-0';

                const pageNumberFromData = pageData?.pageNumber ?? 'N/A';
                if (pageNumberFromData !== 'N/A') {
                    const pageTitle = document.createElement('h4');
                    pageTitle.className = 'text-sm font-semibold text-gray-600 mb-1 mt-1';
                    pageTitle.textContent = `Page ${pageNumberFromData}`;
                    pageDiv.appendChild(pageTitle);
                }

                const productsOnThisPage = pageData?.products ?? [];
                if (Array.isArray(productsOnThisPage) && productsOnThisPage.length > 0) {
                    productsOnThisPage.forEach(product => {
                        const productCard = document.createElement('div');
                        productCard.className = 'p-2 border border-gray-200 rounded bg-gray-50/50 text-xs mb-2';
                        
                        let imageHtml = '<div class="text-center text-gray-400 text-xs py-1 my-1">(No Image)</div>';
                        const imageUrl = product?.imageDataUrl ?? product?.imagePreviewUrl ?? null;
                        const productNameForAlt = escapeHtml(product?.productName ?? product?.name ?? 'Product');
                        const brandNameForAlt = escapeHtml(product?.brandName ?? product?.brand ?? 'N/A');

                        if (imageUrl) {
                            const href = escapeHtml(imageUrl);
                            const title = `${productNameForAlt} (${brandNameForAlt})`;
                            const galleryName = `submission-${submissionId}-modal-page-${pageNumberFromData}`; 
                            imageHtml = `<a href="${href}" class="glightbox block my-1" data-gallery="${galleryName}" data-type="image" title="${title}"><img src="${href}" alt="Image of ${productNameForAlt}" class="max-w-[70px] max-h-[70px] mx-auto rounded border border-gray-300 object-contain" onerror="this.onerror=null;this.src='https://placehold.co/70x70/E5E7EB/6B7280?text=Error';this.alt='Error loading image';"></a>`;
                        } else if (product?.requestStockImage) {
                            imageHtml = `<div class="text-center text-gray-500 text-xs py-1 my-1 italic">(Stock Image Requested)</div>`;
                        }
                        
                        let priceDetail;
                        const regPrice = parseFloat(product?.regularPrice ?? 0);
                        const slPrice = parseFloat(product?.salePrice ?? 0);
                        const manualDesc = (product?.manualDiscountDescription ?? '').trim();

                        if (manualDesc && (isNaN(regPrice) || regPrice === 0) && (isNaN(slPrice) || slPrice === 0)) {
                            priceDetail = `<strong>Discount:</strong> ${escapeHtml(manualDesc)}`;
                        } else {
                            priceDetail = `<strong>Price:</strong> Reg $${regPrice.toFixed(2)} / Sale $${slPrice.toFixed(2)} (${escapeHtml(product?.discountPercent ?? 'N/A')})`;
                        }

                        productCard.innerHTML = `
                            <h5 class="font-semibold text-gray-800 text-[11px] truncate" title="${productNameForAlt}">${productNameForAlt} (${brandNameForAlt})</h5>
                            ${imageHtml}
                            <p><strong>Cat:</strong> ${escapeHtml(product?.category ?? 'N/A')}</p>
                            <p>${priceDetail}</p>
                            ${(product?.sku && product.sku !== 'N/A') ? `<p><strong>SKU:</strong> ${escapeHtml(product.sku)}</p>` : ''}
                            ${(product?.description && product.description !== 'N/A') ? `<p class="mt-1 truncate" title="${escapeHtml(product.description)}"><strong>Desc:</strong> ${escapeHtml(product.description.substring(0,30))}...</p>` : ''}
                        `;
                        pageDiv.appendChild(productCard);
                    });
                } else {
                    const noProductsMsg = document.createElement('p');
                    noProductsMsg.className = 'text-xs text-gray-500 italic';
                    noProductsMsg.textContent = 'No products on this page.';
                    pageDiv.appendChild(noProductsMsg);
                }
                productsContainerDiv.appendChild(pageDiv);
            });
        } else {
            const flatProductsList = formData.products ?? [];
            if (Array.isArray(flatProductsList) && flatProductsList.length > 0) {
                productsSectionTitle.textContent = 'Products (Unpaged)';
                flatProductsList.forEach(product => {
                    const productCard = document.createElement('div');
                    productCard.className = 'p-2 border border-gray-200 rounded bg-gray-50/50 text-xs mb-2';
                    
                    let imageHtml = '<div class="text-center text-gray-400 text-xs py-1 my-1">(No Image)</div>';
                    const imageUrl = product?.imageDataUrl ?? product?.imagePreviewUrl ?? null;
                    const productNameForAlt = escapeHtml(product?.productName ?? product?.name ?? 'Product');
                    const brandNameForAlt = escapeHtml(product?.brandName ?? product?.brand ?? 'N/A');

                    if (imageUrl) {
                        const href = escapeHtml(imageUrl);
                        const title = `${productNameForAlt} (${brandNameForAlt})`;
                        const galleryName = `submission-${submissionId}-modal-flat`;
                        imageHtml = `<a href="${href}" class="glightbox block my-1" data-gallery="${galleryName}" data-type="image" title="${title}"><img src="${href}" alt="Image of ${productNameForAlt}" class="max-w-[70px] max-h-[70px] mx-auto rounded border border-gray-300 object-contain" onerror="this.onerror=null;this.src='https://placehold.co/70x70/E5E7EB/6B7280?text=Error';this.alt='Error loading image';"></a>`;
                    } else if (product?.requestStockImage) {
                         imageHtml = `<div class="text-center text-gray-500 text-xs py-1 my-1 italic">(Stock Image Requested)</div>`;
                    }

                     let priceDetail;
                     const regPrice = parseFloat(product?.regularPrice ?? 0);
                     const slPrice = parseFloat(product?.salePrice ?? 0);
                     const manualDesc = (product?.manualDiscountDescription ?? '').trim();

                     if (manualDesc && (isNaN(regPrice) || regPrice === 0) && (isNaN(slPrice) || slPrice === 0)) {
                         priceDetail = `<strong>Discount:</strong> ${escapeHtml(manualDesc)}`;
                     } else {
                         priceDetail = `<strong>Price:</strong> Reg $${regPrice.toFixed(2)} / Sale $${slPrice.toFixed(2)} (${escapeHtml(product?.discountPercent ?? 'N/A')})`;
                     }

                    productCard.innerHTML = `
                        <h5 class="font-semibold text-gray-800 text-[11px] truncate" title="${productNameForAlt}">${productNameForAlt} (${brandNameForAlt})</h5>
                        ${imageHtml}
                        <p><strong>Cat:</strong> ${escapeHtml(product?.category ?? 'N/A')}</p>
                        <p>${priceDetail}</p>
                         ${(product?.sku && product.sku !== 'N/A') ? `<p><strong>SKU:</strong> ${escapeHtml(product.sku)}</p>` : ''}
                         ${(product?.description && product.description !== 'N/A') ? `<p class="mt-1 truncate" title="${escapeHtml(product.description)}"><strong>Desc:</strong> ${escapeHtml(product.description.substring(0,30))}...</p>` : ''}
                    `;
                    productsContainerDiv.appendChild(productCard);
                });
            } else {
                productsSectionTitle.textContent = 'Products';
                const noProductsMsg = document.createElement('p');
                noProductsMsg.className = 'text-xs text-gray-500 italic';
                noProductsMsg.textContent = 'No products found in this submission.';
                productsContainerDiv.appendChild(noProductsMsg);
            }
        }
        col2.appendChild(productsContainerDiv);
        layoutDiv.appendChild(col2);

        const col3 = document.createElement('div');
        col3.className = 'md:col-span-1 bg-white p-4 rounded-lg shadow space-y-4';
        
        let allProductsForSocialCheck = [];
        if (Array.isArray(productsByPageData) && productsByPageData.length > 0) {
            allProductsForSocialCheck = productsByPageData.flatMap(page => page.products || []);
        } else if (Array.isArray(formData.products)) {
            allProductsForSocialCheck = formData.products;
        }

        const socialProductsList = allProductsForSocialCheck.filter(p => p?.includeInSocial || p?.includeInSocialMedia);
        let socialHtml = '<h3 class="text-md font-semibold text-brand-blue mb-2">Social Media Items</h3>';
        if (socialProductsList.length > 0) {
            socialHtml += '<ul class="list-disc list-inside text-xs space-y-0.5">';
            socialProductsList.forEach(p => { 
                socialHtml += `<li>${escapeHtml(p.productName || p.name)} (${escapeHtml(p.brandName || p.brand || 'N/A')})</li>`; 
            });
            socialHtml += '</ul>';
        } else {
            socialHtml += '<p class="text-xs text-gray-500 italic">No products flagged for social media.</p>';
        }
        col3.innerHTML = socialHtml;

        const pr = formData.printRequests || {};
        let printHtml = '<hr class="my-3 border-brand-neutral-border"><h3 class="text-md font-semibold text-brand-blue mb-2">Print Requests</h3>';
        printHtml += `<ul class="text-xs space-y-0.5">
                        <li><strong>Price Tags:</strong> ${pr.priceTags ? 'Yes' : 'No'}</li>
                        <li><strong>Posters:</strong> ${pr.posters ? 'Yes' : 'No'}</li>
                        <li><strong>Banners:</strong> ${pr.banners ? 'Yes' : 'No'}</li>
                      </ul>`;
        printHtml += `<h4 class="text-xs font-semibold text-gray-600 mt-2 mb-1">Print Notes:</h4>
                      <pre class="text-xs bg-gray-50 p-2 rounded border border-gray-200 whitespace-pre-wrap font-sans">${escapeHtml(pr.notes) || 'No specific print notes.'}</pre>`;
        col3.innerHTML += printHtml;
        layoutDiv.appendChild(col3);

        submissionDetailContentDiv.appendChild(layoutDiv);

        if (typeof GLightbox !== 'undefined') {
            if (currentGlightboxInstance && typeof currentGlightboxInstance.destroy === 'function') {
                currentGlightboxInstance.destroy();
            }
            currentGlightboxInstance = GLightbox({
                selector: '#submissionDetailContent .glightbox', 
                loop: true,
                touchNavigation: true,
            });
        } else {
            console.warn("GLightbox library is not loaded. Image previews in modal will not work.");
        }
    } 

    function closeSubmissionDetailModal() {
        if (!submissionDetailModal) return;
        const modalDialog = submissionDetailModal.querySelector('.bg-brand-neutral-bg');
        if (modalDialog) modalDialog.classList.add('scale-95', 'opacity-0');
        submissionDetailModal.classList.add('opacity-0');
        setTimeout(() => {
            submissionDetailModal.classList.add('pointer-events-none');
            submissionDetailModal.setAttribute('aria-hidden', 'true');
            if (submissionDetailContentDiv) submissionDetailContentDiv.innerHTML = '<p class="text-brand-medium-gray p-4">Loading details...</p>';
        }, 300); 
        if (currentGlightboxInstance && typeof currentGlightboxInstance.close === 'function') {
            currentGlightboxInstance.close();
        }
    }
    
    async function handleDeleteSelectedSubmissions() {
        if (selectedSubmissionIds.size === 0) {
            showCustomConfirmModal("Please select at least one submission to delete.", "No Selection", "OK", () => {});
            return;
        }
        const count = selectedSubmissionIds.size;
        showCustomConfirmModal(
            `Are you sure you want to delete ${count} selected submission(s)? This action cannot be undone.`,
            "Confirm Deletion", "Yes, Delete",
            async () => {
                console.log("Attempting to delete submission IDs:", Array.from(selectedSubmissionIds));
                const token = sessionStorage.getItem('adminToken');
                if (!token) {
                    showCustomConfirmModal("Admin session expired. Please log in again.", "Session Expired", "OK", () => { if (typeof handleAdminLogout === "function") handleAdminLogout(); });
                    return;
                }

                const deletePromises = Array.from(selectedSubmissionIds).map(id => {
                    return fetch(`/api/admin/submission/${id}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` }
                    }).then(response => {
                        if (!response.ok) {
                            console.error(`Error deleting submission ${id}: ${response.status} ${response.statusText}`);
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
                    const failedDeletes = results.filter(r => !r.success && !r.error && r.status !== 401 && r.status !== 403).length;
                    const authFailures = results.filter(r => r.status === 401 || r.status === 403).length;
                    const networkErrors = results.filter(r => r.error).length;

                    let message = "";
                    if (successfulDeletes > 0) message += `${successfulDeletes} submission(s) deleted successfully. `;
                    if (failedDeletes > 0) message += `${failedDeletes} submission(s) could not be deleted. `;
                    if (networkErrors > 0) message += `${networkErrors} deletion(s) failed due to network issues. `;
                    
                    if (authFailures > 0) {
                        message += `Your session expired during the deletion of ${authFailures} item(s). Please log in again.`;
                        showCustomConfirmModal(message, "Deletion Partially Complete & Session Expired", "OK", () => {
                            if (typeof handleAdminLogout === "function") handleAdminLogout();
                            if (typeof loadAdminSubmissions === "function") loadAdminSubmissions(); 
                        });
                        return; 
                    }

                    if (message.trim() === "") message = "No submissions were deleted (this is unexpected).";
                    
                    showCustomConfirmModal(message, "Deletion Complete", "OK", () => {
                        if (typeof loadAdminSubmissions === "function") loadAdminSubmissions(); 
                    });

                } catch (overallError) {
                    console.error('Error processing delete operations:', overallError);
                    showCustomConfirmModal("A critical error occurred while processing deletions. Please check the console and try again.", "Deletion Error", "OK", () => {
                        if (typeof loadAdminSubmissions === "function") loadAdminSubmissions();
                    });
                }
            }
        );
    }

    function updateDeleteButtonState() {
        // console.log('updateDeleteButtonState CALLED. Current selected IDs size:', selectedSubmissionIds.size); // Debugging
        if (!deleteSelectedSubmissionsBtn || !selectedSubmissionsCountSpan || !adminSelectedActionsContainer) {
            // console.log('updateDeleteButtonState: EXITING because one or more DOM elements for button state are missing.');
            return; 
        }

        const count = selectedSubmissionIds.size;
        if (count > 0) {
            adminSelectedActionsContainer.classList.remove('hidden');
            selectedSubmissionsCountSpan.textContent = `${count}`; 
            deleteSelectedSubmissionsBtn.disabled = false;
            deleteSelectedSubmissionsBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        } else {
            adminSelectedActionsContainer.classList.add('hidden');
            selectedSubmissionsCountSpan.textContent = '0';
            deleteSelectedSubmissionsBtn.disabled = true;
            deleteSelectedSubmissionsBtn.classList.add('opacity-50', 'cursor-not-allowed');
        }
    }
    
    function initializeAdminPanel() {
        adminSection = document.getElementById('adminSection');
        adminLoginDiv = document.getElementById('adminLoginDiv'); 
        adminDashboardDiv = document.getElementById('adminDashboardDiv'); 
        adminLoginForm = document.getElementById('adminLoginForm');
        adminUsernameInput = document.getElementById('adminUsername');
        adminPasswordInput = document.getElementById('adminPassword');
        adminLoginErrorDiv = document.getElementById('adminLoginError');
        closeAdminPanelBtn = document.getElementById('closeAdminPanelBtn');
        adminGreetingElement = document.getElementById('adminGreeting');
        adminLogoutBtn = document.getElementById('adminLogoutBtn');
        filterDateStartInput = document.getElementById('filterDateStart');
        filterDateEndInput = document.getElementById('filterDateEnd');
        filterStoreNameInput = document.getElementById('filterStoreName');
        applyFiltersBtn = document.getElementById('applyFiltersBtn');
        clearFiltersBtn = document.getElementById('clearFiltersBtn');
        adminSubmissionsListContainer = document.getElementById('adminSubmissionsListContainer');
        adminSubmissionsListDiv = document.getElementById('adminSubmissionsList');
        
        // Crucial DOM elements for delete functionality
        deleteSelectedSubmissionsBtn = document.getElementById('deleteSelectedSubmissionsBtn');
        selectedSubmissionsCountSpan = document.getElementById('selectedSubmissionsCount');
        adminSelectedActionsContainer = document.getElementById('adminSelectedActionsContainer'); // Corrected ID
        
        // console.log('initializeAdminPanel: adminSelectedActionsContainer assigned:', adminSelectedActionsContainer); 

        submissionDetailModal = document.getElementById('submissionDetailModal');
        submissionDetailModalTitleDOM = document.getElementById('submissionDetailModalTitleDOM'); 
        submissionDetailContentDiv = document.getElementById('submissionDetailContent');
        submissionDetailCloseBtn = document.getElementById('submissionDetailModalCloseBtn');
        submissionDetailModalSecondaryCloseBtn = document.getElementById('submissionDetailModalSecondaryCloseBtn');
        extractPdfBtn = document.getElementById('extractPdfBtn');
        showAdminLoginBtn = document.getElementById('showAdminLoginBtn');

        if (adminLoginForm) adminLoginForm.addEventListener('submit', handleAdminLogin);
        if (adminLogoutBtn) adminLogoutBtn.addEventListener('click', handleAdminLogout);
        if (applyFiltersBtn) applyFiltersBtn.addEventListener('click', loadAdminSubmissions);
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => {
                if(filterDateStartInput) filterDateStartInput.value = '';
                if(filterDateEndInput) filterDateEndInput.value = '';
                if(filterStoreNameInput) filterStoreNameInput.value = '';
                loadAdminSubmissions();
            });
        }
        if (deleteSelectedSubmissionsBtn) {
            deleteSelectedSubmissionsBtn.addEventListener('click', handleDeleteSelectedSubmissions);
        } else {
            console.error("initializeAdminPanel: deleteSelectedSubmissionsBtn not found, cannot attach listener.");
        }

        if (adminSubmissionsListDiv) {
            adminSubmissionsListDiv.addEventListener('click', (event) => {
                const viewLink = event.target.closest('a[data-submission-id]');
                if (viewLink) {
                    event.preventDefault();
                    const submissionId = viewLink.dataset.submissionId;
                    elementThatOpenedModal = viewLink; 
                    fetchAndDisplaySingleSubmission(submissionId);
                }
            });
        }

        if (submissionDetailCloseBtn) submissionDetailCloseBtn.addEventListener('click', closeSubmissionDetailModal);
        if (submissionDetailModalSecondaryCloseBtn) submissionDetailModalSecondaryCloseBtn.addEventListener('click', closeSubmissionDetailModal);
        if (submissionDetailModal) {
            submissionDetailModal.addEventListener('click', (e) => {
                if (e.target === submissionDetailModal) { 
                    closeSubmissionDetailModal();
                }
            });
        }

        if (extractPdfBtn) {
            extractPdfBtn.addEventListener('click', async function() {
                const submissionId = this.dataset.submissionId; 
                if (!submissionId) {
                    showCustomConfirmModal("No submission ID found to extract PDF.", "Error", "OK", () => {});
                    return;
                }
                const token = sessionStorage.getItem('adminToken');
                if (!token) {
                    showCustomConfirmModal("Admin session expired. Please log in again.", "Session Expired", "OK", () => handleAdminLogout());
                    return;
                }

                this.disabled = true;
                this.textContent = 'Extracting...';

                try {
                    const response = await fetch(`/api/admin/extract-pdf/${submissionId}`, {
                        method: 'GET',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (response.ok) {
                        const blob = await response.blob();
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.style.display = 'none';
                        a.href = url;
                        const contentDisposition = response.headers.get('content-disposition');
                        let fileName = `submission-${submissionId}.pdf`;
                        if (contentDisposition) {
                            const fileNameMatch = contentDisposition.match(/filename="?(.+)"?/i);
                            if (fileNameMatch && fileNameMatch.length === 2) fileName = fileNameMatch[1];
                        }
                        a.download = fileName;
                        document.body.appendChild(a);
                        a.click();
                        window.URL.revokeObjectURL(url);
                        a.remove();
                        showCustomConfirmModal("PDF extracted successfully and download should begin.", "PDF Extracted", "OK", () => {});
                    } else {
                         const errorText = await response.text();
                        showCustomConfirmModal(`Failed to extract PDF: ${response.status} - ${escapeHtml(errorText)}`, "Extraction Error", "OK", () => {});
                    }
                } catch (error) {
                    console.error("Error extracting PDF:", error);
                    showCustomConfirmModal("A network error occurred while extracting the PDF.", "Network Error", "OK", () => {});
                } finally {
                    this.disabled = false;
                    this.textContent = 'Extract PDF';
                }
            });
        }

        if (showAdminLoginBtn) {
            showAdminLoginBtn.addEventListener('click', () => {
                if (flyerSubmissionFormContainer) flyerSubmissionFormContainer.style.display = 'none';
                if (adminSection) adminSection.style.display = 'block';
                if (adminLoginDiv) adminLoginDiv.style.display = 'block';
                if (adminDashboardDiv) adminDashboardDiv.style.display = 'none';
                const mainAppNav = document.getElementById('mainAppNavigation');
                if(mainAppNav) mainAppNav.style.display = 'none';
                showAdminLoginBtn.style.display = 'none'; 
                adminUsernameInput?.focus();
            });
        }
        if (closeAdminPanelBtn) {
            closeAdminPanelBtn.addEventListener('click', () => {
                if (adminSection) adminSection.style.display = 'none';
                if (flyerSubmissionFormContainer) flyerSubmissionFormContainer.style.display = 'block';
                const mainAppNav = document.getElementById('mainAppNavigation');
                if(mainAppNav) mainAppNav.style.display = 'flex';
                if (showAdminLoginBtn) showAdminLoginBtn.style.display = 'block';
            });
        }

        const adminToken = sessionStorage.getItem('adminToken');
        const adminUsernameDisplay = sessionStorage.getItem('adminUsernameDisplay');
        if (adminToken && adminLoginDiv && adminDashboardDiv && adminGreetingElement) {
            adminLoginDiv.style.display = 'none';
            adminDashboardDiv.style.display = 'block';
            adminGreetingElement.textContent = `What's a beautiful day, ${escapeHtml(adminUsernameDisplay) || 'Admin'}, eh?`;
            loadAdminSubmissions();
        } else if (adminLoginDiv) { 
            adminLoginDiv.style.display = 'block'; 
            if(adminDashboardDiv) adminDashboardDiv.style.display = 'none';
        }
    }

    // --- Flyer UI Main Action: Final Submission to Backend ---
    async function handleFinalFlyerSubmission() {
        if (!finalSubmitBtn) return;
        finalSubmitBtn.disabled = true;
        finalSubmitBtn.classList.add('opacity-70');
        const originalButtonText = finalSubmitBtn.innerHTML;
        finalSubmitBtn.innerHTML = `Submitting... <svg class="animate-spin -mr-1 ml-3 h-5 w-5 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>`;

        const submissionData = {
            storeName: storeNameInput?.value || '',
            submittedBy: submittedByInput?.value || '',
            flyerValidStartDate: startDateInput?.value || null,
            flyerValidEndDate: endDateInput?.value || null,
            generalNotes: notesTextarea?.value || '',
            canadaPostFlyer: toggleCanadaPostFlyer ? toggleCanadaPostFlyer.checked : false,
            digitalInStoreFlyer: toggleDigitalFlyer ? toggleDigitalFlyer.checked : false,
            productsByPage: getAllProductsByPage().map(page => ({
                pageNumber: page.pageNumber,
                products: page.products.map(p => ({
                    productName: p.name,
                    brandName: p.brand,
                    sku: p.sku,
                    category: p.category,
                    imageFileName: p.imageFileName,
                    imageDataUrl: p.imagePreviewUrl, 
                    description: p.description,
                    sizeDimensions: p.sizeDimensions,
                    colourFinish: p.colourFinish,
                    regularPrice: parseFloat(p.regularPrice) || 0,
                    salePrice: parseFloat(p.salePrice) || 0,
                    discountPercent: p.discountPercent,
                    manualDiscountDescription: p.manualDiscountDescription,
                    isMainFlyerProduct: p.isMainFlyerProduct,
                    isBundle: p.isBundle,
                    bundleItems: p.bundleItems,
                    requestStockImage: p.requestStockImage,
                    includeInSocial: p.includeInSocial
                }))
            })),
            socialMediaSelections: Array.from(productDataStore.values())
                                     .filter(p => p.includeInSocial)
                                     .map(p => ({ productName: p.name, brandName: p.brand })),
            printRequests: { ...printMaterialSelections },
            submissionTimestamp: new Date().toISOString()
        };

        console.log("Submitting flyer data:", submissionData);

        try {
            const response = await fetch('/api/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(submissionData)
            });

            const responseText = await response.text();
            let result;

            if (response.ok) {
                try {
                    result = JSON.parse(responseText);
                    showCustomConfirmModal(
                        `<strong>Success!</strong><br>Your flyer (ID: ${escapeHtml(result.submissionId || 'N/A')}) has been submitted.<br>Thank you, eh!`,
                        "Submission Complete", "Create New Flyer",
                        () => {
                            resetAppForNewFlyer();
                            hideCustomConfirmModal(); 
                        }
                    );
                    if(editSubmissionBtn) setButtonEnabled(editSubmissionBtn, false, '', 'Flyer already submitted.');
                    setButtonEnabled(finalSubmitBtn, false, '', 'Flyer already submitted.');
                    finalSubmitBtn.innerHTML = 'Submitted!';
                } catch (e) {
                    console.error("Submission Success (status ok) but failed to parse JSON response:", responseText, e);
                    showCustomConfirmModal(
                        `<strong>Submission Noted (but an issue occurred):</strong> Server sent an unexpected success response. Please verify with admin. Details: ${escapeHtml(responseText.substring(0,200))}`,
                        "Unexpected Server Response", "OK", 
                        () => { /* Allow user to dismiss, state is uncertain */ }
                    );
                    finalSubmitBtn.innerHTML = 'Submitted (Verify)'; 
                }
            } else { 
                try {
                    result = JSON.parse(responseText); 
                } catch (e) {
                    console.error("Submission Failed: Server returned non-JSON error response.", responseText);
                    result = { message: `Server error: ${response.status}. Response: ${responseText.substring(0, 200)}` };
                }
                showCustomConfirmModal(
                    `<strong>Error:</strong> ${escapeHtml(result.message || response.statusText || 'Unknown error')}<br>Please try again. If the problem persists, contact support.`,
                    "Submission Failed", "Try Again",
                    () => {
                        finalSubmitBtn.disabled = false;
                        finalSubmitBtn.classList.remove('opacity-70');
                        finalSubmitBtn.innerHTML = originalButtonText;
                    }
                );
            }
        } catch (error) { 
            console.error("Network error during submission:", error);
            showCustomConfirmModal(
                `<strong>Network Error:</strong> Could not connect to the server. Please check your internet connection and try again.`,
                "Submission Failed", "Try Again",
                () => {
                    finalSubmitBtn.disabled = false;
                    finalSubmitBtn.classList.remove('opacity-70');
                    finalSubmitBtn.innerHTML = originalButtonText;
                }
            );
        }
    }

    // --- MODIFICATION START: Enhanced Stepper Event Listeners ---
    if (nextStepStoreInfoBtn) {
    nextStepStoreInfoBtn.addEventListener('click', () => {
        console.log("nextStepStoreInfoBtn clicked"); // Debug
        const storeInfoComplete = checkStoreInfoCompletion();
        console.log("checkStoreInfoCompletion returned:", storeInfoComplete); // Debug

        if (storeInfoComplete) {
            navigateToStep('add-products');
        } else {
            console.log("Showing custom confirm modal because store info is incomplete."); // Debug
            showCustomConfirmModal(
                "Please complete all required fields in Store Information (Step 1) before proceeding.",
                "Prerequisite incomplete",
                "OK",
                () => {
                    const firstInvalidField = storeInfoForm?.querySelector(`.${ERROR_BORDER_CLASS}, input:invalid, select:invalid, textarea:invalid`);
                    firstInvalidField?.focus();
                }
            );
        }
    });
}

    if (nextStepAddProductsBtn) {
        nextStepAddProductsBtn.addEventListener('click', () => {
            if (checkAddProductsCompletion()) { 
                navigateToStep('social-print');
                renderSocialSelectionsDisplay(); 
            } else {
                showCustomConfirmModal(
                    "Please add at least one product to the flyer (Step 2) before proceeding.", 
                    "Prerequisite incomplete", 
                    "OK", 
                    () => {
                        const activePageAddSlot = document.querySelector('.page-content:not([style*="display: none"]) .add-product-slot:not(.disabled-slot)');
                        activePageAddSlot?.focus();
                    }
                );
            }
        });
    }

    if (reviewSubmitBtn) {
        reviewSubmitBtn.addEventListener('click', () => {
            handleReviewAndSubmit(); 
        });
    }
    // --- MODIFICATION END ---

    if (editSubmissionBtn) {
        editSubmissionBtn.addEventListener('click', () => {
            navigateToStep(lastActiveStepBeforeReview || 'store-info'); 
        });
    }

    if (finalSubmitBtn) {
        finalSubmitBtn.addEventListener('click', () => {
            showCustomConfirmModal(
                "Are you sure you want to submit this flyer? Once submitted, it may not be editable.",
                "Final Submission Confirmation",
                "Yes, Submit Flyer",
                () => {
                    handleFinalFlyerSubmission();
                }
            );
        });
    }

    [storeNameInput, submittedByInput, startDateInput, endDateInput, notesTextarea].forEach(input => {
        if (input) {
            input.addEventListener('input', checkStoreInfoCompletion);
            if (input.type === 'date') { 
                input.addEventListener('change', checkStoreInfoCompletion);
            }
        }
    });
    if(toggleCanadaPostFlyer) toggleCanadaPostFlyer.addEventListener('change', checkStoreInfoCompletion);
    if(toggleDigitalFlyer) toggleDigitalFlyer.addEventListener('change', checkStoreInfoCompletion);

    // --- Initial Application Setup ---
    initializeAdminPanel(); 
    
    checkStoreInfoCompletion(); 
    checkAddProductsCompletion(); 
    updateNextButtonVisibility(); 
    addNewProductPage(true); 
    initializeFlyerProductionTimeline(); 
    updateStepperVisuals(); 
    stepOrder.forEach(stepKey => { 
        const stepAnchor = stepElements[stepKey];
        // Ensure makeStepClickable is only called if the anchor exists
        if (stepAnchor) { 
            makeStepClickable(stepAnchor, stepKey);
        }
    });
    setupProductCardActions(); 
    renderSocialSelectionsDisplay(); 
    if(maxSocialProductsDisplay) maxSocialProductsDisplay.textContent = MAX_SOCIAL_PRODUCTS;


    if (storeNameInput) storeNameInput.focus(); 
    highlightActiveSection('store-info'); 

    console.log("Flyer Submission UI & Admin Script Fully Initialized.");
}); // End DOMContentLoaded
