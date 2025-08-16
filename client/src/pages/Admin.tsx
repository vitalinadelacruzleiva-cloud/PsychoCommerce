import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Product, OrderWithItems } from "@shared/schema";
import { 
  Package, 
  Smartphone, 
  Plus, 
  Edit, 
  Trash2, 
  Eye,
  Users,
  ShoppingCart,
  TrendingUp,
  Clock
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const productSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  description: z.string().min(1, "La descripción es requerida"),
  price: z.string().min(1, "El precio es requerido"),
  imageUrl: z.string().url("URL de imagen inválida"),
  type: z.enum(["physical", "digital"]),
  ageRange: z.string().min(1, "El rango de edad es requerido"),
  category: z.string().min(1, "La categoría es requerida"),
  stock: z.number().nullable(),
  isActive: z.boolean(),
});

type ProductForm = z.infer<typeof productSchema>;

export default function Admin() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState<"dashboard" | "products" | "orders">("dashboard");
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);

  // Redirect if not admin
  if (!user || user.role !== "admin") {
    setLocation("/");
    return null;
  }

  const { data: products = [], isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: orders = [], isLoading: ordersLoading } = useQuery<OrderWithItems[]>({
    queryKey: ["/api/orders"],
    enabled: !!user?.id,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<ProductForm>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      description: "",
      price: "",
      imageUrl: "",
      type: "physical",
      ageRange: "",
      category: "",
      stock: null,
      isActive: true,
    },
  });

  const watchType = watch("type");

  const createProductMutation = useMutation({
    mutationFn: async (productData: any) => {
      const token = localStorage.getItem("auth_token");
      const response = await fetch("/api/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(productData),
      });
      if (!response.ok) throw new Error("Error al crear producto");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Producto creado",
        description: "El producto ha sido creado exitosamente",
      });
      setIsProductDialogOpen(false);
      reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: async (productData: any) => {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`/api/products/${editingProduct?.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(productData),
      });
      if (!response.ok) throw new Error("Error al actualizar producto");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Producto actualizado",
        description: "El producto ha sido actualizado exitosamente",
      });
      setIsProductDialogOpen(false);
      setEditingProduct(null);
      reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (productId: string) => {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`/api/products/${productId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Error al eliminar producto");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Producto eliminado",
        description: "El producto ha sido eliminado exitosamente",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error("Error al actualizar estado");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({
        title: "Estado actualizado",
        description: "El estado del pedido ha sido actualizado",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const formatPrice = (price: string) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 0,
    }).format(parseFloat(price));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-500";
      case "confirmed": return "bg-blue-500";
      case "shipped": return "bg-purple-500";
      case "delivered": return "bg-green-500";
      default: return "bg-gray-500";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending": return "Pendiente";
      case "confirmed": return "Confirmado";
      case "shipped": return "Enviado";
      case "delivered": return "Entregado";
      default: return status;
    }
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    reset({
      name: product.name,
      description: product.description,
      price: product.price,
      imageUrl: product.imageUrl,
      type: product.type as "physical" | "digital",
      ageRange: product.ageRange,
      category: product.category,
      stock: product.stock,
      isActive: product.isActive,
    });
    setIsProductDialogOpen(true);
  };

  const handleCreateProduct = () => {
    setEditingProduct(null);
    reset();
    setIsProductDialogOpen(true);
  };

  const onSubmit = (data: ProductForm) => {
    const productData = {
      ...data,
      stock: data.type === "digital" ? null : data.stock,
    };

    if (editingProduct) {
      updateProductMutation.mutate(productData);
    } else {
      createProductMutation.mutate(productData);
    }
  };

  const totalRevenue = orders.reduce((sum, order) => sum + parseFloat(order.total), 0);
  const pendingOrders = orders.filter(order => order.status === "pending").length;
  const activeProducts = products.filter(product => product.isActive).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Panel de Administración</h1>
          <p className="text-gray-600">Gestiona productos y pedidos de EduJuegos</p>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-2xl shadow-lg mb-8">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setSelectedTab("dashboard")}
              className={`px-6 py-4 font-medium text-sm ${
                selectedTab === "dashboard"
                  ? "text-mint border-b-2 border-mint"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setSelectedTab("products")}
              className={`px-6 py-4 font-medium text-sm ${
                selectedTab === "products"
                  ? "text-mint border-b-2 border-mint"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Productos
            </button>
            <button
              onClick={() => setSelectedTab("orders")}
              className={`px-6 py-4 font-medium text-sm ${
                selectedTab === "orders"
                  ? "text-mint border-b-2 border-mint"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Pedidos
            </button>
          </div>
        </div>

        {/* Dashboard Tab */}
        {selectedTab === "dashboard" && (
          <div className="space-y-8">
            {/* Stats Cards */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Ingresos Totales</p>
                      <p className="text-2xl font-bold text-gray-900">{formatPrice(totalRevenue.toString())}</p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Pedidos Pendientes</p>
                      <p className="text-2xl font-bold text-gray-900">{pendingOrders}</p>
                    </div>
                    <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                      <Clock className="w-6 h-6 text-yellow-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Productos Activos</p>
                      <p className="text-2xl font-bold text-gray-900">{activeProducts}</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <Package className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Pedidos</p>
                      <p className="text-2xl font-bold text-gray-900">{orders.length}</p>
                    </div>
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                      <ShoppingCart className="w-6 h-6 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Orders */}
            <Card>
              <CardHeader>
                <CardTitle>Pedidos Recientes</CardTitle>
              </CardHeader>
              <CardContent>
                {ordersLoading ? (
                  <div className="flex justify-center py-8">
                    <LoadingSpinner size="lg" />
                  </div>
                ) : orders.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No hay pedidos disponibles</p>
                ) : (
                  <div className="space-y-4">
                    {orders.slice(0, 5).map((order) => (
                      <div key={order.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-semibold text-gray-900">{order.customerName}</p>
                          <p className="text-sm text-gray-600">{order.customerEmail}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-mint">{formatPrice(order.total)}</p>
                          <Badge className={`${getStatusColor(order.status)} text-white`}>
                            {getStatusLabel(order.status)}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Products Tab */}
        {selectedTab === "products" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Gestión de Productos</h2>
              <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={handleCreateProduct} className="btn-gradient text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    Nuevo Producto
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingProduct ? "Editar Producto" : "Crear Nuevo Producto"}
                    </DialogTitle>
                  </DialogHeader>
                  
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div>
                      <Label htmlFor="name">Nombre del Producto</Label>
                      <Input id="name" {...register("name")} />
                      {errors.name && <p className="text-red-500 text-sm">{errors.name.message}</p>}
                    </div>

                    <div>
                      <Label htmlFor="description">Descripción</Label>
                      <Textarea id="description" {...register("description")} />
                      {errors.description && <p className="text-red-500 text-sm">{errors.description.message}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="price">Precio (ARS)</Label>
                        <Input id="price" {...register("price")} />
                        {errors.price && <p className="text-red-500 text-sm">{errors.price.message}</p>}
                      </div>

                      <div>
                        <Label htmlFor="type">Tipo</Label>
                        <Select onValueChange={(value) => setValue("type", value as "physical" | "digital")}>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar tipo" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="physical">Físico</SelectItem>
                            <SelectItem value="digital">Digital</SelectItem>
                          </SelectContent>
                        </Select>
                        {errors.type && <p className="text-red-500 text-sm">{errors.type.message}</p>}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="ageRange">Rango de Edad</Label>
                        <Input id="ageRange" placeholder="ej: 3-8" {...register("ageRange")} />
                        {errors.ageRange && <p className="text-red-500 text-sm">{errors.ageRange.message}</p>}
                      </div>

                      <div>
                        <Label htmlFor="category">Categoría</Label>
                        <Input id="category" {...register("category")} />
                        {errors.category && <p className="text-red-500 text-sm">{errors.category.message}</p>}
                      </div>
                    </div>

                    {watchType === "physical" && (
                      <div>
                        <Label htmlFor="stock">Stock</Label>
                        <Input 
                          id="stock" 
                          type="number" 
                          {...register("stock", { valueAsNumber: true })} 
                        />
                        {errors.stock && <p className="text-red-500 text-sm">{errors.stock.message}</p>}
                      </div>
                    )}

                    <div>
                      <Label htmlFor="imageUrl">URL de Imagen</Label>
                      <Input id="imageUrl" {...register("imageUrl")} />
                      {errors.imageUrl && <p className="text-red-500 text-sm">{errors.imageUrl.message}</p>}
                    </div>

                    <div className="flex justify-end space-x-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsProductDialogOpen(false)}
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="submit"
                        disabled={createProductMutation.isPending || updateProductMutation.isPending}
                        className="btn-gradient text-white"
                      >
                        {createProductMutation.isPending || updateProductMutation.isPending ? (
                          <LoadingSpinner size="sm" className="mr-2" />
                        ) : null}
                        {editingProduct ? "Actualizar" : "Crear"} Producto
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {productsLoading ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner size="lg" />
              </div>
            ) : (
              <div className="grid gap-6">
                {products.map((product) => (
                  <Card key={product.id}>
                    <CardContent className="p-6">
                      <div className="flex items-start space-x-4">
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-20 h-20 object-cover rounded-lg"
                        />
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900">{product.name}</h3>
                              <p className="text-gray-600 text-sm mt-1">{product.description}</p>
                              <div className="flex items-center space-x-4 mt-2">
                                <Badge className={product.type === "physical" ? "bg-orange-500" : "bg-sky"}>
                                  {product.type === "physical" ? (
                                    <>
                                      <Package className="w-3 h-3 mr-1" />
                                      Físico
                                    </>
                                  ) : (
                                    <>
                                      <Smartphone className="w-3 h-3 mr-1" />
                                      Digital
                                    </>
                                  )}
                                </Badge>
                                <span className="text-sm text-gray-500">{product.ageRange} años</span>
                                <span className="text-sm text-gray-500">{product.category}</span>
                                {product.type === "physical" && (
                                  <span className="text-sm text-gray-500">Stock: {product.stock}</span>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-xl font-bold text-mint">{formatPrice(product.price)}</p>
                              <div className="flex items-center space-x-2 mt-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEditProduct(product)}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => deleteProductMutation.mutate(product.id)}
                                  disabled={deleteProductMutation.isPending}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Orders Tab */}
        {selectedTab === "orders" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Gestión de Pedidos</h2>

            {ordersLoading ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner size="lg" />
              </div>
            ) : orders.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <ShoppingCart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-xl text-gray-600">No hay pedidos disponibles</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {orders.map((order) => (
                  <Card key={order.id}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            Pedido #{order.id.slice(-8)}
                          </h3>
                          <p className="text-gray-600">{order.customerName}</p>
                          <p className="text-gray-600 text-sm">{order.customerEmail}</p>
                          <p className="text-gray-600 text-sm">{order.customerPhone}</p>
                          <p className="text-gray-600 text-sm">{order.shippingAddress}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-mint">{formatPrice(order.total)}</p>
                          <div className="mt-2">
                            <Select
                              defaultValue={order.status}
                              onValueChange={(status) =>
                                updateOrderStatusMutation.mutate({ orderId: order.id, status })
                              }
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Pendiente</SelectItem>
                                <SelectItem value="confirmed">Confirmado</SelectItem>
                                <SelectItem value="shipped">Enviado</SelectItem>
                                <SelectItem value="delivered">Entregado</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>

                      <div className="border-t pt-4">
                        <h4 className="font-semibold text-gray-900 mb-3">Productos:</h4>
                        <div className="space-y-2">
                          {order.items.map((item) => (
                            <div key={item.id} className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <img
                                  src={item.product.imageUrl}
                                  alt={item.product.name}
                                  className="w-12 h-12 object-cover rounded"
                                />
                                <div>
                                  <p className="font-medium">{item.product.name}</p>
                                  <p className="text-sm text-gray-600">Cantidad: {item.quantity}</p>
                                </div>
                              </div>
                              <p className="font-semibold text-mint">
                                {formatPrice((parseFloat(item.price) * item.quantity).toString())}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
