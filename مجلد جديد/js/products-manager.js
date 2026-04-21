// ========================================
// TWESSY - PRODUCTS MANAGER.JS
// إدارة المنتجات للمشرف مع دعم GitHub Pages
// ========================================

class ProductsManager {
    constructor() {
        this.db = window.TwessyDB;
        this.products = [];
        this.init();
    }
    
    async init() {
        await this.loadProducts();
        this.setupEventListeners();
        this.displayProducts();
    }
    
    // ========== تحميل المنتجات ==========
    async loadProducts() {
        try {
            this.products = await this.db.getProducts();
            console.log(`✅ تم تحميل ${this.products.length} منتج`);
        } catch (error) {
            console.error('❌ خطأ في تحميل المنتجات:', error);
            this.products = [];
        }
    }
    
    // ========== إعداد مستمعي الأحداث ==========
    setupEventListeners() {
        // نموذج إضافة منتج
        const form = document.getElementById('addProductForm');
        if (form) {
            form.addEventListener('submit', (e) => this.handleAddProduct(e));
        }
        
        // زر حفظ المنتج
        const saveBtn = document.getElementById('saveProductBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveProduct());
        }
        
        // بحث
        const searchInput = document.getElementById('productSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
        }
        
        // فلتر الفئة
        const categoryFilter = document.getElementById('categoryFilter');
        if (categoryFilter) {
            categoryFilter.addEventListener('change', () => this.applyFilters());
        }
        
        // تصدير البيانات
        const exportBtn = document.getElementById('exportProductsBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportProducts());
        }
        
        // استيراد البيانات
        const importBtn = document.getElementById('importProductsBtn');
        const importFile = document.getElementById('importProductsFile');
        if (importBtn && importFile) {
            importBtn.addEventListener('click', () => importFile.click());
            importFile.addEventListener('change', (e) => this.importProducts(e));
        }
    }
    
    // ========== عرض المنتجات في الجدول ==========
    displayProducts(productsToShow = null) {
        const products = productsToShow || this.products;
        const tbody = document.getElementById('productsTableBody');
        
        if (!tbody) return;
        
        if (products.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; padding: 40px;">
                        <i class="fas fa-box-open" style="font-size: 48px; color: #ccc; margin-bottom: 10px;"></i>
                        <p>لا توجد منتجات حالياً</p>
                        <button class="btn btn-primary" onclick="showAddProductForm()">
                            <i class="fas fa-plus"></i> إضافة منتج جديد
                        </button>
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = products.map(product => this.createProductRow(product)).join('');
        
        // إضافة مستمعي الأحداث لأزرار الإجراءات
        this.setupRowActions();
    }
    
    // ========== إنشاء صف منتج ==========
    createProductRow(product) {
        const stockStatus = this.getStockStatus(product.stock);
        const badge = product.badge ? this.getBadgeLabel(product.badge) : '';
        
        return `
            <tr data-product-id="${product.id}">
                <td><input type="checkbox" class="product-checkbox" value="${product.id}"></td>
                <td>
                    <img src="${product.image || 'https://via.placeholder.com/50'}" 
                         alt="${product.name}" 
                         style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;">
                </td>
                <td>
                    <strong>${product.name}</strong>
                    ${badge}
                    <br>
                    <small style="color: #999;">SKU: ${product.sku || 'N/A'}</small>
                </td>
                <td>${product.category}</td>
                <td>
                    <strong>$${product.price}</strong>
                    ${product.oldPrice ? `<br><small style="text-decoration: line-through; color: #999;">$${product.oldPrice}</small>` : ''}
                </td>
                <td>
                    <span class="stock-indicator ${stockStatus.class}">
                        ${product.stock}
                    </span>
                </td>
                <td>
                    <span class="status-badge ${product.inStock ? 'success' : 'danger'}">
                        ${product.inStock ? 'متوفر' : 'غير متوفر'}
                    </span>
                </td>
                <td>
                    <button class="action-btn edit-btn" onclick="productsManager.editProduct('${product.id}')" title="تعديل">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn view-btn" onclick="productsManager.viewProduct('${product.id}')" title="عرض">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="action-btn delete-btn" onclick="productsManager.deleteProduct('${product.id}')" title="حذف">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }
    
    // ========== حالة المخزون ==========
    getStockStatus(stock) {
        if (stock === 0) return { class: 'out-of-stock', label: 'نفذ المخزون' };
        if (stock < 10) return { class: 'low-stock', label: 'مخزون منخفض' };
        return { class: 'in-stock', label: 'متوفر' };
    }
    
    // ========== تسمية الشارة ==========
    getBadgeLabel(badge) {
        const badges = {
            'new': '<span class="product-badge new">جديد</span>',
            'sale': '<span class="product-badge sale">تخفيض</span>',
            'featured': '<span class="product-badge featured">مميز</span>'
        };
        return badges[badge] || '';
    }
    
    // ========== إضافة منتج ==========
    async handleAddProduct(e) {
        e.preventDefault();
        
        const productData = {
            name: document.getElementById('productName').value,
            category: document.getElementById('productCategory').value,
            description: document.getElementById('productDescription').value,
            price: parseFloat(document.getElementById('productPrice').value),
            oldPrice: parseFloat(document.getElementById('productOldPrice').value) || null,
            stock: parseInt(document.getElementById('productStock').value),
            sku: document.getElementById('productSku').value,
            badge: document.getElementById('productBadge').value,
            featured: document.getElementById('featuredProduct').checked,
            inStock: parseInt(document.getElementById('productStock').value) > 0,
            image: await this.handleImageUpload(),
            images: await this.handleGalleryUpload(),
            tags: document.getElementById('productTags').value.split(',').map(t => t.trim()),
            metaTitle: document.getElementById('metaTitle').value,
            metaDescription: document.getElementById('metaDescription').value,
            metaKeywords: document.getElementById('metaKeywords').value,
            createdAt: new Date().toISOString()
        };
        
        // حفظ المنتج
        const newProduct = await this.db.addProduct(productData);
        this.products.push(newProduct);
        
        // تحديث العرض
        this.displayProducts();
        
        // إظهار رسالة نجاح مع تعليمات النشر
        this.showDeploymentInstructions(newProduct);
        
        // إعادة تعيين النموذج
        e.target.reset();
        
        // العودة لقسم المنتجات
        this.showProductsSection();
    }
    
    // ========== تعليمات النشر ==========
    showDeploymentInstructions(product) {
        const message = `
            ✅ تم حفظ المنتج محلياً!
            
            📦 لجعل المنتج يظهر للعملاء على GitHub Pages:
            
            1️⃣ قم بتصدير المنتجات من زر "تصدير البيانات"
            2️⃣ استبدل ملف products-data.json في مجلد data
            3️⃣ ارفع التغييرات إلى GitHub
            
            أو استخدم Google Sheets للقاعدة البيانات المباشرة.
        `;
        
        alert(message);
    }
    
    // ========== معالجة رفع الصورة ==========
    async handleImageUpload() {
        const fileInput = document.getElementById('productImage');
        const file = fileInput.files[0];
        
        if (!file) return 'https://via.placeholder.com/300x300?text=No+Image';
        
        // تحويل الصورة إلى Base64 للتخزين المؤقت
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(file);
        });
    }
    
    // ========== معالجة رفع معرض الصور ==========
    async handleGalleryUpload() {
        const fileInput = document.getElementById('productGallery');
        const files = Array.from(fileInput.files);
        
        if (files.length === 0) return [];
        
        const images = [];
        for (const file of files) {
            const base64 = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.readAsDataURL(file);
            });
            images.push(base64);
        }
        
        return images;
    }
    
    // ========== تعديل منتج ==========
    editProduct(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return;
        
        // فتح مودال التعديل
        this.openEditModal(product);
    }
    
    // ========== فتح مودال التعديل ==========
    openEditModal(product) {
        // إنشاء مودال تعديل ديناميكي
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content modal-lg">
                <div class="modal-header">
                    <h3>تعديل المنتج: ${product.name}</h3>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="editProductForm">
                        <!-- نسخة مصغرة من نموذج الإضافة مع القيم الحالية -->
                        <div class="form-group">
                            <label>اسم المنتج</label>
                            <input type="text" id="editName" value="${product.name}" required>
                        </div>
                        <div class="form-group">
                            <label>السعر</label>
                            <input type="number" id="editPrice" value="${product.price}" step="0.01" required>
                        </div>
                        <div class="form-group">
                            <label>المخزون</label>
                            <input type="number" id="editStock" value="${product.stock}" required>
                        </div>
                        <div class="form-actions">
                            <button type="submit" class="btn btn-primary">حفظ التغييرات</button>
                            <button type="button" class="btn btn-outline" onclick="this.closest('.modal').remove()">إلغاء</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // معالجة تقديم النموذج
        modal.querySelector('#editProductForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const updates = {
                name: document.getElementById('editName').value,
                price: parseFloat(document.getElementById('editPrice').value),
                stock: parseInt(document.getElementById('editStock').value),
                inStock: parseInt(document.getElementById('editStock').value) > 0
            };
            
            await this.db.updateProduct(product.id, updates);
            
            // تحديث المنتج في المصفوفة
            const index = this.products.findIndex(p => p.id === product.id);
            if (index !== -1) {
                this.products[index] = { ...this.products[index], ...updates };
            }
            
            this.displayProducts();
            modal.remove();
            
            alert('✅ تم تحديث المنتج بنجاح!');
        });
    }
    
    // ========== عرض منتج ==========
    viewProduct(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return;
        
        console.log('عرض المنتج:', product);
        // يمكنك فتح نافذة منبثقة بتفاصيل المنتج
    }
    
    // ========== حذف منتج ==========
    async deleteProduct(productId) {
        if (!confirm('هل أنت متأكد من حذف هذا المنتج؟')) return;
        
        await this.db.deleteProduct(productId);
        this.products = this.products.filter(p => p.id !== productId);
        this.displayProducts();
        
        alert('✅ تم حذف المنتج بنجاح!');
    }
    
    // ========== البحث ==========
    handleSearch(query) {
        if (!query) {
            this.displayProducts();
            return;
        }
        
        const filtered = this.products.filter(product =>
            product.name.toLowerCase().includes(query.toLowerCase()) ||
            product.description.toLowerCase().includes(query.toLowerCase()) ||
            product.sku.toLowerCase().includes(query.toLowerCase())
        );
        
        this.displayProducts(filtered);
    }
    
    // ========== تطبيق الفلاتر ==========
    applyFilters() {
        const category = document.getElementById('categoryFilter').value;
        const stockFilter = document.getElementById('stockFilter')?.value;
        
        let filtered = this.products;
        
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
        
        this.displayProducts(filtered);
    }
    
    // ========== تصدير المنتجات ==========
    exportProducts() {
        const data = {
            version: '1.0',
            exportedAt: new Date().toISOString(),
            products: this.products,
            total: this.products.length
        };
        
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `twessy-products-${Date.now()}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
        
        alert(`✅ تم تصدير ${this.products.length} منتج بنجاح!`);
    }
    
    // ========== استيراد المنتجات ==========
    importProducts(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = JSON.parse(e.target.result);
                const importedProducts = data.products || data;
                
                if (Array.isArray(importedProducts)) {
                    // إضافة المنتجات المستوردة
                    for (const product of importedProducts) {
                        await this.db.addProduct(product);
                    }
                    
                    await this.loadProducts();
                    this.displayProducts();
                    
                    alert(`✅ تم استيراد ${importedProducts.length} منتج بنجاح!`);
                }
            } catch (error) {
                console.error('خطأ في استيراد المنتجات:', error);
                alert('❌ خطأ في قراءة الملف. تأكد من صحة التنسيق.');
            }
            
            event.target.value = '';
        };
        
        reader.readAsText(file);
    }
    
    // ========== إظهار قسم المنتجات ==========
    showProductsSection() {
        // تفعيل قسم المنتجات في لوحة التحكم
        const productsLink = document.querySelector('[data-section="products"]');
        if (productsLink) {
            productsLink.click();
        }
    }
    
    // ========== إعدادات مستمعي الصفوف ==========
    setupRowActions() {
        // تحديد الكل
        const selectAll = document.getElementById('selectAll');
        if (selectAll) {
            selectAll.addEventListener('change', (e) => {
                document.querySelectorAll('.product-checkbox').forEach(cb => {
                    cb.checked = e.target.checked;
                });
            });
        }
    }
}

// ========== تهيئة مدير المنتجات ==========
let productsManager;

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('productsTableBody')) {
        productsManager = new ProductsManager();
        window.productsManager = productsManager;
    }
});

// ========== وظائف عامة ==========
function showAddProductForm() {
    const addProductLink = document.querySelector('[data-section="add-product"]');
    if (addProductLink) {
        addProductLink.click();
    }
}