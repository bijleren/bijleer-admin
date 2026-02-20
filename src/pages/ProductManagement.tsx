import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Edit2, Save, X, Check, Trash2 } from 'lucide-react';

interface Product {
  id: string;
  product_type: string;
  name: string;
  description?: string;
  is_active: boolean;
  base_price_eur?: number;
  default_duration_days: number;
  features: string[];
}

interface PricingTier {
  id: string;
  product_id: string;
  tier_code: string;
  tier_name: string;
  price_eur: number;
  storage_gb?: number;
  features: string[];
  is_active: boolean;
  sort_order: number;
}

export default function ProductManagement() {
  const [products, setProducts] = useState<Product[]>([]);
  const [tiers, setTiers] = useState<PricingTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [editingTier, setEditingTier] = useState<string | null>(null);
  const [addingTierForProduct, setAddingTierForProduct] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Product>>({});
  const [tierForm, setTierForm] = useState<Partial<PricingTier>>({});
  const [newTierForm, setNewTierForm] = useState<Partial<PricingTier>>({});

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);

      const [productsRes, tiersRes] = await Promise.all([
        supabase.from('product_catalog').select('*').order('product_type'),
        supabase.from('pricing_tiers').select('*').order('sort_order'),
      ]);

      if (productsRes.error) throw productsRes.error;
      if (tiersRes.error) throw tiersRes.error;

      setProducts(productsRes.data || []);
      setTiers(tiersRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Failed to load products');
    } finally {
      setLoading(false);
    }
  }

  function startEditingProduct(product: Product) {
    setEditingProduct(product.id);
    setEditForm(product);
  }

  function cancelEditingProduct() {
    setEditingProduct(null);
    setEditForm({});
  }

  async function saveProduct() {
    if (!editingProduct) return;

    try {
      const { error } = await supabase
        .from('product_catalog')
        .update({
          name: editForm.name,
          description: editForm.description,
          is_active: editForm.is_active,
          base_price_eur: editForm.base_price_eur,
          default_duration_days: editForm.default_duration_days,
        })
        .eq('id', editingProduct);

      if (error) throw error;

      alert('Product updated successfully');
      setEditingProduct(null);
      setEditForm({});
      fetchData();
    } catch (error) {
      console.error('Error updating product:', error);
      alert('Failed to update product');
    }
  }

  function startEditingTier(tier: PricingTier) {
    setEditingTier(tier.id);
    setTierForm(tier);
  }

  function cancelEditingTier() {
    setEditingTier(null);
    setTierForm({});
  }

  async function saveTier() {
    if (!editingTier) return;

    try {
      const { error } = await supabase
        .from('pricing_tiers')
        .update({
          tier_name: tierForm.tier_name,
          price_eur: tierForm.price_eur,
          storage_gb: tierForm.storage_gb,
          is_active: tierForm.is_active,
          sort_order: tierForm.sort_order,
        })
        .eq('id', editingTier);

      if (error) throw error;

      alert('Pricing tier updated successfully');
      setEditingTier(null);
      setTierForm({});
      fetchData();
    } catch (error) {
      console.error('Error updating tier:', error);
      alert('Failed to update tier');
    }
  }

  function getTiersForProduct(productId: string) {
    return tiers.filter((t) => t.product_id === productId);
  }

  function startAddingTier(productId: string) {
    setAddingTierForProduct(productId);
    setNewTierForm({
      product_id: productId,
      tier_code: '',
      tier_name: '',
      price_eur: 0,
      storage_gb: undefined,
      features: [],
      is_active: true,
      sort_order: 0,
    });
  }

  function cancelAddingTier() {
    setAddingTierForProduct(null);
    setNewTierForm({});
  }

  async function createTier() {
    if (!addingTierForProduct || !newTierForm.tier_code || !newTierForm.tier_name) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const { error } = await supabase.from('pricing_tiers').insert({
        product_id: addingTierForProduct,
        tier_code: newTierForm.tier_code,
        tier_name: newTierForm.tier_name,
        price_eur: newTierForm.price_eur || 0,
        storage_gb: newTierForm.storage_gb,
        features: newTierForm.features || [],
        is_active: newTierForm.is_active ?? true,
        sort_order: newTierForm.sort_order || 0,
      });

      if (error) throw error;

      alert('Pricing tier created successfully');
      setAddingTierForProduct(null);
      setNewTierForm({});
      fetchData();
    } catch (error) {
      console.error('Error creating tier:', error);
      alert('Failed to create tier');
    }
  }

  async function deleteTier(tierId: string) {
    if (!confirm('Are you sure you want to delete this tier?')) return;

    try {
      const { error } = await supabase.from('pricing_tiers').delete().eq('id', tierId);

      if (error) throw error;

      alert('Tier deleted successfully');
      fetchData();
    } catch (error) {
      console.error('Error deleting tier:', error);
      alert('Failed to delete tier');
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-gray-500">Loading products...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Product Management</h1>
        <p className="text-gray-600 mt-1">
          Manage product catalog, pricing, and features
        </p>
      </div>

      <div className="space-y-6">
        {products.map((product) => {
          const isEditing = editingProduct === product.id;
          const productTiers = getTiersForProduct(product.id);

          return (
            <div key={product.id} className="bg-white rounded-lg border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {isEditing ? (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Product Name
                          </label>
                          <input
                            type="text"
                            value={editForm.name || ''}
                            onChange={(e) =>
                              setEditForm({ ...editForm, name: e.target.value })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Description
                          </label>
                          <textarea
                            value={editForm.description || ''}
                            onChange={(e) =>
                              setEditForm({ ...editForm, description: e.target.value })
                            }
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Base Price (EUR/year)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={editForm.base_price_eur || ''}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  base_price_eur: parseFloat(e.target.value),
                                })
                              }
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Default Duration (days)
                            </label>
                            <input
                              type="number"
                              value={editForm.default_duration_days || 365}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  default_duration_days: parseInt(e.target.value),
                                })
                              }
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={`active-${product.id}`}
                            checked={editForm.is_active}
                            onChange={(e) =>
                              setEditForm({ ...editForm, is_active: e.target.checked })
                            }
                            className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                          />
                          <label
                            htmlFor={`active-${product.id}`}
                            className="text-sm text-gray-700"
                          >
                            Active (available for purchase)
                          </label>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-3 mb-2">
                          <h2 className="text-xl font-semibold text-gray-900">
                            {product.name}
                          </h2>
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              product.is_active
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {product.is_active ? 'Active' : 'Inactive'}
                          </span>
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded font-mono">
                            {product.product_type}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          {product.description || 'No description'}
                        </p>
                        <div className="flex gap-4 text-sm text-gray-600">
                          {product.base_price_eur && (
                            <span>
                              Base Price: <strong>€{product.base_price_eur}/year</strong>
                            </span>
                          )}
                          <span>
                            Duration: <strong>{product.default_duration_days} days</strong>
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    {isEditing ? (
                      <>
                        <button
                          onClick={saveProduct}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                          title="Save"
                        >
                          <Check className="w-5 h-5" />
                        </button>
                        <button
                          onClick={cancelEditingProduct}
                          className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg"
                          title="Cancel"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => startEditingProduct(product)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="Edit Product"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900">
                    Pricing Tiers ({productTiers.length})
                  </h3>
                  {addingTierForProduct !== product.id && (
                    <button
                      onClick={() => startAddingTier(product.id)}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      <Plus className="w-4 h-4" />
                      Add Tier
                    </button>
                  )}
                </div>

                {addingTierForProduct === product.id && (
                  <div className="mb-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">
                      Create New Tier
                    </h4>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Tier Code <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={newTierForm.tier_code || ''}
                          onChange={(e) =>
                            setNewTierForm({
                              ...newTierForm,
                              tier_code: e.target.value.toUpperCase(),
                            })
                          }
                          placeholder="e.g., BASIC, PRO, PREMIUM"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Tier Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={newTierForm.tier_name || ''}
                          onChange={(e) =>
                            setNewTierForm({ ...newTierForm, tier_name: e.target.value })
                          }
                          placeholder="e.g., Basic Plan"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Price (EUR/year) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={newTierForm.price_eur || ''}
                          onChange={(e) =>
                            setNewTierForm({
                              ...newTierForm,
                              price_eur: parseFloat(e.target.value),
                            })
                          }
                          placeholder="0.00"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Storage (GB)
                        </label>
                        <input
                          type="number"
                          value={newTierForm.storage_gb || ''}
                          onChange={(e) =>
                            setNewTierForm({
                              ...newTierForm,
                              storage_gb: parseInt(e.target.value),
                            })
                          }
                          placeholder="Optional"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Sort Order
                        </label>
                        <input
                          type="number"
                          value={newTierForm.sort_order || 0}
                          onChange={(e) =>
                            setNewTierForm({
                              ...newTierForm,
                              sort_order: parseInt(e.target.value),
                            })
                          }
                          placeholder="0"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                      </div>
                      <div className="flex items-center pt-6">
                        <input
                          type="checkbox"
                          id="new-tier-active"
                          checked={newTierForm.is_active ?? true}
                          onChange={(e) =>
                            setNewTierForm({ ...newTierForm, is_active: e.target.checked })
                          }
                          className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <label
                          htmlFor="new-tier-active"
                          className="ml-2 text-sm text-gray-700"
                        >
                          Active
                        </label>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={createTier}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                      >
                        <Check className="w-4 h-4" />
                        Create Tier
                      </button>
                      <button
                        onClick={cancelAddingTier}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {productTiers.length > 0 && (
                  <div className="space-y-3">
                    {productTiers.map((tier) => {
                      const isEditingTier = editingTier === tier.id;

                      return (
                        <div
                          key={tier.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          {isEditingTier ? (
                            <div className="flex-1 grid grid-cols-5 gap-3">
                              <input
                                type="text"
                                value={tierForm.tier_name || ''}
                                onChange={(e) =>
                                  setTierForm({ ...tierForm, tier_name: e.target.value })
                                }
                                placeholder="Tier Name"
                                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                              <input
                                type="number"
                                step="0.01"
                                value={tierForm.price_eur || ''}
                                onChange={(e) =>
                                  setTierForm({
                                    ...tierForm,
                                    price_eur: parseFloat(e.target.value),
                                  })
                                }
                                placeholder="Price (EUR)"
                                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                              <input
                                type="number"
                                value={tierForm.storage_gb || ''}
                                onChange={(e) =>
                                  setTierForm({
                                    ...tierForm,
                                    storage_gb: parseInt(e.target.value),
                                  })
                                }
                                placeholder="Storage (GB)"
                                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                              <input
                                type="number"
                                value={tierForm.sort_order || 0}
                                onChange={(e) =>
                                  setTierForm({
                                    ...tierForm,
                                    sort_order: parseInt(e.target.value),
                                  })
                                }
                                placeholder="Sort Order"
                                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                              <div className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={tierForm.is_active}
                                  onChange={(e) =>
                                    setTierForm({ ...tierForm, is_active: e.target.checked })
                                  }
                                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                />
                                <label className="ml-2 text-sm text-gray-700">Active</label>
                              </div>
                            </div>
                          ) : (
                            <div className="flex-1 flex items-center gap-6">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-gray-900">
                                    {tier.tier_name}
                                  </span>
                                  <span
                                    className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                                      tier.is_active
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-gray-100 text-gray-800'
                                    }`}
                                  >
                                    {tier.is_active ? 'Active' : 'Inactive'}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                  Code: {tier.tier_code}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-lg font-semibold text-gray-900">
                                  €{tier.price_eur}
                                  <span className="text-sm font-normal text-gray-500">
                                    /year
                                  </span>
                                </p>
                                {tier.storage_gb && (
                                  <p className="text-xs text-gray-500">{tier.storage_gb} GB</p>
                                )}
                              </div>
                            </div>
                          )}
                          <div className="flex gap-2 ml-4">
                            {isEditingTier ? (
                              <>
                                <button
                                  onClick={saveTier}
                                  className="p-2 text-green-600 hover:bg-green-100 rounded-lg"
                                  title="Save"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={cancelEditingTier}
                                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                  title="Cancel"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => startEditingTier(tier)}
                                  className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg"
                                  title="Edit Tier"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => deleteTier(tier.id)}
                                  className="p-2 text-red-600 hover:bg-red-100 rounded-lg"
                                  title="Delete Tier"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {productTiers.length === 0 && addingTierForProduct !== product.id && (
                  <p className="text-sm text-gray-500 italic">
                    No pricing tiers defined. Click "Add Tier" to create one.
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
