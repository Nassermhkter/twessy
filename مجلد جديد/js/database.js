// ========================================
// TWESSY - DATABASE.JS
// قاعدة بيانات المنتجات باستخدام Google Sheets
// ========================================

class TwessyDatabase {
    constructor() {
        // معرف Google Sheet العام
        this.SHEET_ID = '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms'; // سنقوم بتغييره لاحقاً
        
        // رابط JSON للقراءة فقط
        this.SHEETS_URL = `https://sheets.googleapis.com/v4/spreadsheets/${this.SHEET_ID}/values/Products?key=AIzaSyD_sample_key`;
        
        // تخزين مؤقت
        this.cache = {
            products: null,
            lastUpdate: null
        };
        
        // مدة التخزين المؤقت (5 دقائق)
        this.CACHE_DURATION = 5 * 60 * 1000;
    }
    
    // ========== جلب جميع المنتجات ==========
    async getProducts() {
        // التحقق من التخزين المؤقت
        if (this.cache.products && this.cache.lastUpdate) {
            const timeSinceUpdate = Date.now() - this.cache.lastUpdate;
            if (timeSinceUpdate < this.CACHE_DURATION) {
                console.log('📦 استخدام المنتجات من التخزين المؤقت');
                return this.cache.products;
            }
        }
        
        try {
            // محاولة جلب البيانات من Google Sheets
            const products = await this.fetchFromGoogleSheets();
            return products;
        } catch (error) {
            console.log('⚠️ تعذر الاتصال بـ Google Sheets، استخدام البيانات المحلية');
            return this.getLocalProducts();
        }
    }
    
    // ========== جلب من Google Sheets ==========
    async fetchFromGoogleSheets() {
        try {
            const response = await fetch(this.SHEETS_URL);
            
            if (!response.ok) {
                throw new Error('فشل في جلب البيانات');
            }
            
            const data = await response.json();
            const products = this.parseSheetData(data.values);
            
            // تحديث التخزين المؤقت
            this.cache.products = products;
            this.cache.lastUpdate = Date.now();
            
            // حفظ نسخة محلية احتياطية
            this.saveToLocalStorage(products);
            
            console.log(`✅ تم تحميل ${products.length} منتج من Google Sheets`);
            return products;
            
        } catch (error) {
            console.error('❌ خطأ في جلب البيانات:', error);
            throw error;
        }
    }
    
    // ========== تحويل بيانات الجدول إلى كائنات ==========
    parseSheetData(values) {
        if (!values || values.length < 2) {
            return [];
        }
        
        // الصف الأول يحتوي على أسماء الأعمدة
        const headers = values[0];
        const products = [];
        
        // تحويل كل صف إلى كائن منتج
        for (let i = 1; i < values.length; i++) {
            const row = values[i];
            const product = {};
            
            headers.forEach((header, index) => {
                let value = row[index] || '';
                
                // تحويل القيم حسب النوع
                if (header === 'price' || header === 'oldPrice') {
                    value = parseFloat(value) || 0;
                } else if (header === 'stock') {
                    value = parseInt(value) || 0;
                } else if (header === 'featured' || header === 'inStock') {
                    value = value === 'TRUE' || value === 'true' || value === true;
                } else if (header === 'images') {
                    value = value ? value.split(',').map(img => img.trim()) : [];
                }
                
                product[header] = value;
            });
            
            // إضافة معرف فريد إذا لم يكن موجوداً
            if (!product.id) {
                product.id = 'prod_' + Date.now() + '_' + i;
            }
            
            products.push(product);
        }
        
        return products;
    }
    
    // ========== البيانات المحلية الاحتياطية ==========
    getLocalProducts() {
        // محاولة استرجاع من localStorage
        const saved = localStorage.getItem('twessy_products_backup');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error('خطأ في قراءة البيانات المحلية');
            }
        }
        
        // بيانات افتراضية
        return this.getDefaultProducts();
    }
    
    // ========== حفظ نسخة محلية ==========
    saveToLocalStorage(products) {
        try {
            localStorage.setItem('twessy_products_backup', JSON.stringify(products));
            localStorage.setItem('twessy_products_backup_time', Date.now().toString());
        } catch (e) {
            console.warn('تعذر حفظ البيانات محلياً');
        }
    }
    
    // ========== المنتجات الافتراضية ==========
    getDefaultProducts() {
        return [
            {
                id: '1',
                name: 'فرشاة أسنان كهربائية سونيك',
                category: 'فرش الأسنان',
                description: 'فرشاة أسنان كهربائية بتقنية السونيك لتنظيف عميق وفعال',
                price: 25,
                oldPrice: 35,
                stock: 50,
                inStock: true,
                badge: 'sale',
                featured: true,
                image: 'https://via.placeholder.com/300x300?text=Electric+Toothbrush',
                images: [],
                sku: 'TW-001',
                rating: 4.8,
                reviews: 124
            },
            {
                id: '2',
                name: 'معجون أسنان بالفلورايد للحماية الكاملة',
                category: 'معاجين الأسنان',
                description: 'معجون أسنان متطور يحمي من التسوس ويقوي المينا',
                price: 8,
                oldPrice: null,
                stock: 100,
                inStock: true,
                badge: null,
                featured: true,
                image: 'https://via.placeholder.com/300x300?text=Toothpaste',
                images: [],
                sku: 'TW-002',
                rating: 4.6,
                reviews: 89
            },
            {
                id: '3',
                name: 'خيط أسنان طبي مشمع',
                category: 'خيط الأسنان',
                description: 'خيط أسنان طبي سهل الاستخدام لإزالة البلاك بين الأسنان',
                price: 5,
                oldPrice: 7,
                stock: 200,
                inStock: true,
                badge: 'sale',
                featured: false,
                image: 'https://via.placeholder.com/300x300?text=Dental+Floss',
                images: [],
                sku: 'TW-003',
                rating: 4.7,
                reviews: 56
            },
            {
                id: '4',
                name: 'مجموعة تبييض الأسنان الاحترافية',
                category: 'مبيضات الأسنان',
                description: 'مجموعة كاملة لتبييض الأسنان في المنزل بنتائج احترافية',
                price: 45,
                oldPrice: 60,
                stock: 30,
                inStock: true,
                badge: 'featured',
                featured: true,
                image: 'https://via.placeholder.com/300x300?text=Whitening+Kit',
                images: [],
                sku: 'TW-004',
                rating: 4.9,
                reviews: 67
            },
            {
                id: '5',
                name: 'غسول فم منعش خالي من الكحول',
                category: 'أجهزة العناية',
                description: 'غسول فم لطيف ينعش النفس ويحارب البكتيريا',
                price: 12,
                oldPrice: null,
                stock: 75,
                inStock: true,
                badge: 'new',
                featured: true,
                image: 'https://via.placeholder.com/300x300?text=Mouthwash',
                images: [],
                sku: 'TW-005',
                rating: 4.5,
                reviews: 43
            },
            {
                id: '6',
                name: 'فرشاة أسنان يدوية فائقة النعومة',
                category: 'فرش الأسنان',
                description: 'فرشاة أسنان بشعيرات ناعمة جداً للأسنان الحساسة',
                price: 4,
                oldPrice: null,
                stock: 150,
                inStock: true,
                badge: null,
                featured: false,
                image: 'https://via.placeholder.com/300x300?text=Soft+Toothbrush',
                images: [],
                sku: 'TW-006',
                rating: 4.4,
                reviews: 112
            }
        ];
    }
    
    // ========== إضافة منتج جديد (للمشرف) ==========
    async addProduct(productData) {
        // في الإصدار الحقيقي، سيتم إرسال البيانات إلى Google Apps Script
        console.log('📝 إضافة منتج جديد:', productData);
        
        // حفظ في localStorage كحل مؤقت
        const products = this.getLocalProducts();
        productData.id = 'prod_' + Date.now();
        products.push(productData);
        this.saveToLocalStorage(products);
        
        // تحديث التخزين المؤقت
        this.cache.products = products;
        this.cache.lastUpdate = Date.now();
        
        return productData;
    }
    
    // ========== تحديث منتج ==========
    async updateProduct(productId, updates) {
        const products = await this.getProducts();
        const index = products.findIndex(p => p.id === productId);
        
        if (index !== -1) {
            products[index] = { ...products[index], ...updates };
            this.saveToLocalStorage(products);
            this.cache.products = products;
            return products[index];
        }
        
        return null;
    }
    
    // ========== حذف منتج ==========
    async deleteProduct(productId) {
        const products = await this.getProducts();
        const filtered = products.filter(p => p.id !== productId);
        
        this.saveToLocalStorage(filtered);
        this.cache.products = filtered;
        
        return true;
    }
    
    // ========== البحث عن منتجات ==========
    async searchProducts(query) {
        const products = await this.getProducts();
        const searchTerm = query.toLowerCase();
        
        return products.filter(product => 
            product.name.toLowerCase().includes(searchTerm) ||
            product.description.toLowerCase().includes(searchTerm) ||
            product.category.toLowerCase().includes(searchTerm)
        );
    }
    
    // ========== الحصول على منتجات حسب الفئة ==========
    async getProductsByCategory(category) {
        const products = await this.getProducts();
        
        if (!category || category === 'all') {
            return products;
        }
        
        return products.filter(product => product.category === category);
    }
    
    // ========== الحصول على المنتجات المميزة ==========
    async getFeaturedProducts(limit = 4) {
        const products = await this.getProducts();
        return products
            .filter(p => p.featured === true)
            .slice(0, limit);
    }
}

// ========== تصدير نسخة واحدة من قاعدة البيانات ==========
const db = new TwessyDatabase();

// جعلها متاحة عالمياً
window.TwessyDB = db;