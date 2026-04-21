// ========================================
// TWESSY - ADMIN.JS
// لوحة تحكم المشرف - نسخة مبسطة وفعالة
// ========================================

// كلمة مرور المشرف الافتراضية
const ADMIN_PASSWORD = 'admin123';

// ========== المنتجات ==========
let products = [];

// ========== تهيئة الصفحة ==========
document.addEventListener('DOMContentLoaded', function() {
    // التحقق من صلاحية المشرف
    checkAdminAuth();
    
    // تحميل المنتجات
    loadProducts();
    
    // تهيئة التنقل
    initNavigation();
    
    // تهيئة التاريخ
    initDate();
    
    // تهيئة النماذج
    initForms();
    
    // تهيئة أزرار التصدير والاستيراد
    initExportImport();
    
    // تحديث الإحصائيات
    updateStats();
});

// ========== التحقق من صلاحية المشرف ==========
function checkAdminAuth() {
    const isAuth = sessionStorage.getItem('twessy_admin_auth');
    
    if (!isAuth) {
        const password = prompt('🔐 الرجاء إدخال كلمة مرور المشرف:');
        
        if (password === ADMIN_PASSWORD || password === 'Twessy2025') {
            sessionStorage.setItem('twessy_admin_auth', 'true');
            showNotification('✅ تم تسجيل الدخول بنجاح', 'success');
        } else {
            alert('❌ كلمة المرور غير صحيحة!');
            window.location.href = 'index.html';
        }
    }
    
    // تسجيل الخروج
    document.getElementById('adminLogout')?.addEventListener('click', function() {
        sessionStorage.removeItem('twessy_admin_auth');
        window.location.href = 'index.html';
    });
}

// ========== تحميل المنتجات ==========
function loadProducts() {
    // محاولة تحميل من localStorage
    const saved = localStorage.getItem('twessy_products');
    
    if (saved) {
        try {
            products = JSON.parse(saved);
        } catch (e) {
            products = getDefaultProducts();
        }
    } else {
        products = getDefaultProducts();
        saveProducts();
    }
    
    displayProducts();
    updateProductsCount();
}

// ========== حفظ المنتجات ==========
function saveProducts() {
    localStorage.setItem('twessy_products', JSON.stringify(products));
}

// ========== عرض المنتجات في الجدول ==========
function displayProducts(filteredProducts = null) {
    const tbody = document.getElementById('productsTableBody');
    if (!tbody) return;
    
    const productsToShow = filteredProducts || products;
    
    if (productsToShow.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 40px;">
                    <i class="fas fa-box-open" style="font-size: 48px; color: #ccc;"></i>
                    <p style="margin-top: 15px;">لا توجد منتجات</p>
                    <button class="btn btn-primary" onclick="document.querySelector('[data-section=\\'add-product\\']').click()">
                        <i class="fas fa-plus"></i> إضافة منتج
                    </button>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = productsToShow.map(product => `
        <tr>
            <td><input type="checkbox" class="product-checkbox" value="${product.id}"></td>
            <td>
                <img src="${product.image || 'https://via.placeholder.com/50'}" 
                     style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;">
            </td>
            <td>
                <strong>${product.name}</strong>
                ${product.badge ? `<span class="product-badge ${product.badge}">${getBadgeText(product.badge)}</span>` : ''}
                <br><small>SKU: ${product.sku || 'N/A'}</small>
            </td>
            <td>${product.category}</td>
            <td>
                <strong>$${product.price}</strong>
                ${product.oldPrice ? `<br><small style="text-decoration: line-through;">$${product.oldPrice}</small>` : ''}
            </td>
            <td>
                <span class="stock-indicator ${getStockClass(product.stock)}">${product.stock}</span>
            </td>
            <td>
                <span class="status-badge ${product.inStock ? 'success' : 'danger'}">
                    ${product.inStock ? 'متوفر' : 'غير متوفر'}
                </span>
            </td>
            <td>
                <button class="action-btn edit-btn" onclick="editProduct('${product.id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn delete-btn" onclick="deleteProduct('${product.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
    
    // تحديث تحديد الكل
    initSelectAll();
}

// ========== تهيئة النماذج ==========
function initForms() {
    const form = document.getElementById('addProductForm');
    
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            addProduct(false);
        });
    }
    
    // زر حفظ وإضافة آخر
    document.getElementById('saveAndContinue')?.addEventListener('click', function() {
        addProduct(true);
    });
    
    // زر إلغاء
    document.getElementById('cancelAddProduct')?.addEventListener('click', function() {
        if (confirm('هل أنت متأكد من الإلغاء؟')) {
            form.reset();
            document.getElementById('imagePreview').innerHTML = '';
            document.querySelector('[data-section="products"]').click();
        }
    });
    
    // معاينة الصورة
    document.getElementById('productImage')?.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                document.getElementById('imagePreview').innerHTML = 
                    `<img src="${e.target.result}" style="max-width: 100%; max-height: 200px; border-radius: 8px;">`;
            };
            reader.readAsDataURL(file);
        }
    });
    
    // بحث المنتجات
    document.getElementById('productSearch')?.addEventListener('input', function(e) {
        const query = e.target.value.toLowerCase();
        const filtered = products.filter(p => 
            p.name.toLowerCase().includes(query) || 
            (p.sku && p.sku.toLowerCase().includes(query))
        );
        displayProducts(filtered);
    });
    
    // فلتر الفئة
    document.getElementById('categoryFilter')?.addEventListener('change', filterProducts);
    document.getElementById('stockFilter')?.addEventListener('change', filterProducts);
}

// ========== إضافة منتج ==========
function addProduct(continueAdding) {
    // جمع البيانات
    const imageFile = document.getElementById('productImage').files[0];
    
    // معالجة الصورة
    if (imageFile) {
        const reader = new FileReader();
        reader.onload = function(e) {
            saveProductData(e.target.result, continueAdding);
        };
        reader.readAsDataURL(imageFile);
    } else {
        saveProductData('https://via.placeholder.com/300x300?text=' + encodeURIComponent(document.getElementById('productName').value), continueAdding);
    }
}

function saveProductData(imageUrl, continueAdding) {
    const product = {
        id: 'prod_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        name: document.getElementById('productName').value,
        category: document.getElementById('productCategory').value,
        description: document.getElementById('productDescription').value,
        price: parseFloat(document.getElementById('productPrice').value),
        oldPrice: parseFloat(document.getElementById('productOldPrice').value) || null,
        stock: parseInt(document.getElementById('productStock').value),
        sku: document.getElementById('productSku').value,
        badge: document.getElementById('productBadge').value,
        featured: document.getElementById('featuredProduct')?.checked || false,
        inStock: parseInt(document.getElementById('productStock').value) > 0,
        image: imageUrl,
        createdAt: new Date().toISOString()
    };
    
    // إضافة للمنتجات
    products.push(product);
    saveProducts();
    
    showNotification('✅ تم إضافة المنتج بنجاح!', 'success');
    updateStats();
    updateProductsCount();
    
    if (continueAdding) {
        document.getElementById('addProductForm').reset();
        document.getElementById('imagePreview').innerHTML = '';
        document.getElementById('productName').focus();
    } else {
        document.querySelector('[data-section="products"]').click();
        displayProducts();
    }
}

// ========== تعديل منتج ==========
function editProduct(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    // فتح قسم الإضافة وتعبئة البيانات
    document.querySelector('[data-section="add-product"]').click();
    
    setTimeout(() => {
        document.getElementById('productName').value = product.name;
        document.getElementById('productCategory').value = product.category;
        document.getElementById('productDescription').value = product.description;
        document.getElementById('productPrice').value = product.price;
        document.getElementById('productOldPrice').value = product.oldPrice || '';
        document.getElementById('productStock').value = product.stock;
        document.getElementById('productSku').value = product.sku;
        document.getElementById('productBadge').value = product.badge || '';
        document.getElementById('featuredProduct').checked = product.featured || false;
        
        if (product.image) {
            document.getElementById('imagePreview').innerHTML = 
                `<img src="${product.image}" style="max-width: 100%; max-height: 200px; border-radius: 8px;">`;
        }
        
        // تغيير نص الزر
        const submitBtn = document.querySelector('#addProductForm button[type="submit"]');
        submitBtn.innerHTML = '<i class="fas fa-save"></i> تحديث المنتج';
        
        // حذف المنتج القديم عند التحديث
        const form = document.getElementById('addProductForm');
        const oldSubmit = form.onsubmit;
        form.onsubmit = function(e) {
            e.preventDefault();
            
            // حذف المنتج القديم
            products = products.filter(p => p.id !== productId);
            
            // إضافة المنتج المحدث
            addProduct(false);
            
            // إعادة النص الأصلي
            submitBtn.innerHTML = '<i class="fas fa-save"></i> حفظ المنتج';
            form.onsubmit = oldSubmit;
        };
    }, 100);
}

// ========== حذف منتج ==========
function deleteProduct(productId) {
    if (!confirm('هل أنت متأكد من حذف هذا المنتج؟')) return;
    
    products = products.filter(p => p.id !== productId);
    saveProducts();
    displayProducts();
    updateStats();
    updateProductsCount();
    
    showNotification('🗑️ تم حذف المنتج', 'info');
}

// ========== فلترة المنتجات ==========
function filterProducts() {
    const category = document.getElementById('categoryFilter')?.value;
    const stockFilter = document.getElementById('stockFilter')?.value;
    
    let filtered = [...products];
    
    if (category) {
        filtered = filtered.filter(p => p.category === category);
    }
    
    if (stockFilter) {
        if (stockFilter === 'in-stock') {
            filtered = filtered.filter(p => p.stock > 0);
        } else if (stockFilter === 'low-stock') {
            filtered = filtered.filter(p => p.stock > 0 && p.stock < 10);
        } else if (stockFilter === 'out-of-stock') {
            filtered = filtered.filter(p => p.stock === 0);
        }
    }
    
    displayProducts(filtered);
}

// ========== تصدير واستيراد ==========
function initExportImport() {
    // تصدير
    document.getElementById('exportProductsBtn')?.addEventListener('click', function() {
        const data = {
            version: '1.0',
            exportedAt: new Date().toISOString(),
            products: products,
            total: products.length
        };
        
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `twessy-products-${Date.now()}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
        showNotification(`📦 تم تصدير ${products.length} منتج`, 'success');
    });
    
    // استيراد
    document.getElementById('importProductsBtn')?.addEventListener('click', function() {
        document.getElementById('importProductsFile').click();
    });
    
    document.getElementById('importProductsFile')?.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = JSON.parse(e.target.result);
                const importedProducts = data.products || data;
                
                if (Array.isArray(importedProducts) && importedProducts.length > 0) {
                    if (confirm(`استيراد ${importedProducts.length} منتج؟ (سيتم دمجها مع المنتجات الحالية)`)) {
                        products = [...products, ...importedProducts];
                        saveProducts();
                        displayProducts();
                        updateStats();
                        updateProductsCount();
                        showNotification(`✅ تم استيراد ${importedProducts.length} منتج`, 'success');
                    }
                }
            } catch (error) {
                alert('❌ خطأ في قراءة الملف');
            }
            
            e.target.value = '';
        };
        
        reader.readAsText(file);
    });
}

// ========== تحديث الإحصائيات ==========
function updateStats() {
    document.getElementById('totalProducts').textContent = products.length;
}

function updateProductsCount() {
    const countEl = document.getElementById('productsCountDisplay');
    if (countEl) countEl.textContent = products.length;
}

// ========== تهيئة التنقل ==========
function initNavigation() {
    document.querySelectorAll('.nav-link[data-section]').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            const sectionId = this.dataset.section;
            
            // تحديث القائمة النشطة
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            this.classList.add('active');
            
            // إظهار القسم
            document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
            document.getElementById(sectionId + 'Section').classList.add('active');
            
            // تحديث العنوان
            const titles = {
                'dashboard': 'لوحة التحكم',
                'products': 'إدارة المنتجات',
                'add-product': 'إضافة منتج',
                'categories': 'إدارة الفئات',
                'orders': 'إدارة الطلبات',
                'customers': 'العملاء',
                'settings': 'الإعدادات'
            };
            document.getElementById('pageTitle').textContent = titles[sectionId] || sectionId;
            
            // تحديث جدول المنتجات عند العودة للقسم
            if (sectionId === 'products') {
                displayProducts();
            }
        });
    });
    
    // زر إضافة منتج من قسم المنتجات
    document.getElementById('showAddProductFormBtn')?.addEventListener('click', function() {
        document.querySelector('[data-section="add-product"]').click();
    });
}

// ========== تهيئة التاريخ ==========
function initDate() {
    const dateEl = document.getElementById('currentDate');
    if (dateEl) {
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        dateEl.textContent = new Date().toLocaleDateString('ar-SA', options);
    }
}

// ========== تحديد الكل ==========
function initSelectAll() {
    const selectAll = document.getElementById('selectAll');
    if (selectAll) {
        selectAll.addEventListener('change', function() {
            document.querySelectorAll('.product-checkbox').forEach(cb => {
                cb.checked = this.checked;
            });
        });
    }
}

// ========== دوال مساعدة ==========
function getDefaultProducts() {
    return [
        {
            id: '1',
            name: 'فرشاة أسنان كهربائية سونيك',
            category: 'فرش الأسنان',
            description: 'فرشاة أسنان كهربائية بتقنية السونيك',
            price: 25,
            oldPrice: 35,
            stock: 50,
            inStock: true,
            badge: 'sale',
            featured: true,
            image: 'https://via.placeholder.com/300x300?text=Electric+Toothbrush',
            sku: 'TW-001'
        },
        {
            id: '2',
            name: 'معجون أسنان بالفلورايد',
            category: 'معاجين الأسنان',
            description: 'معجون أسنان متطور للحماية',
            price: 8,
            stock: 100,
            inStock: true,
            badge: '',
            featured: true,
            image: 'https://via.placeholder.com/300x300?text=Toothpaste',
            sku: 'TW-002'
        }
    ];
}

function getBadgeText(badge) {
    const badges = { 'new': 'جديد', 'sale': 'تخفيض', 'featured': 'مميز' };
    return badges[badge] || badge;
}

function getStockClass(stock) {
    if (stock === 0) return 'out-of-stock';
    if (stock < 10) return 'low-stock';
    return 'in-stock';
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type} show`;
    notification.innerHTML = `<span>${message}</span>`;
    notification.style.cssText = `
        position: fixed; bottom: 20px; left: 20px; background: ${type === 'success' ? '#27AE60' : '#3498DB'};
        color: white; padding: 12px 20px; border-radius: 8px; z-index: 9999; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// ========== دوال عامة ==========
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;