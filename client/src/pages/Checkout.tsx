import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Product } from "@shared/schema";
import { CheckoutForm } from "@/types";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";
import { ArrowLeft, ShoppingCart } from "lucide-react";

const checkoutSchema = z.object({
  customerName: z.string().min(1, "El nombre es requerido"),
  customerEmail: z.string().email("Email inválido"),
  customerPhone: z.string().min(1, "El teléfono es requerido"),
  shippingAddress: z.string().min(1, "La dirección es requerida"),
});

export default function Checkout() {
  const [, setLocation] = useLocation();
  const { items, getCartTotal, getCartItemsWithProducts, clearCart } = useCart();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CheckoutForm>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      customerName: "",
      customerEmail: "",
      customerPhone: "",
      shippingAddress: "",
    },
  });

  const createOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      const response = await apiRequest("POST", "/api/orders", orderData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "¡Pedido confirmado!",
        description: "Tu pedido ha sido creado exitosamente",
      });
      clearCart();
      setLocation("/");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Error al crear el pedido",
        variant: "destructive",
      });
    },
  });

  const cartItems = getCartItemsWithProducts(products);
  const total = getCartTotal(products);

  const formatPrice = (price: string) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 0,
    }).format(parseFloat(price));
  };

  const onSubmit = async (data: CheckoutForm) => {
    const orderItems = cartItems.map(({ product, quantity }) => ({
      productId: product.id,
      quantity,
      price: product.price,
    }));

    const orderData = {
      ...data,
      total: total.toString(),
      status: "pending",
      items: orderItems,
    };

    createOrderMutation.mutate(orderData);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <ShoppingCart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Tu carrito está vacío</h1>
            <p className="text-gray-600 mb-8">
              Agrega algunos productos a tu carrito antes de proceder al checkout
            </p>
            <Link href="/products">
              <Button className="btn-gradient text-white">Ver Productos</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <Link href="/products">
            <Button variant="ghost" className="flex items-center space-x-2 text-mint hover:text-mint/80">
              <ArrowLeft className="w-4 h-4" />
              <span>Volver a productos</span>
            </Button>
          </Link>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Checkout Form */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-gray-900">
                  Información de envío
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  <div>
                    <Label htmlFor="customerName" className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre completo
                    </Label>
                    <Input
                      id="customerName"
                      {...register("customerName")}
                      className="w-full"
                    />
                    {errors.customerName && (
                      <p className="text-red-500 text-sm mt-1">{errors.customerName.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="customerEmail" className="block text-sm font-medium text-gray-700 mb-2">
                      Email
                    </Label>
                    <Input
                      id="customerEmail"
                      type="email"
                      {...register("customerEmail")}
                      className="w-full"
                    />
                    {errors.customerEmail && (
                      <p className="text-red-500 text-sm mt-1">{errors.customerEmail.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="customerPhone" className="block text-sm font-medium text-gray-700 mb-2">
                      Teléfono
                    </Label>
                    <Input
                      id="customerPhone"
                      {...register("customerPhone")}
                      className="w-full"
                    />
                    {errors.customerPhone && (
                      <p className="text-red-500 text-sm mt-1">{errors.customerPhone.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="shippingAddress" className="block text-sm font-medium text-gray-700 mb-2">
                      Dirección de envío
                    </Label>
                    <Input
                      id="shippingAddress"
                      {...register("shippingAddress")}
                      className="w-full"
                    />
                    {errors.shippingAddress && (
                      <p className="text-red-500 text-sm mt-1">{errors.shippingAddress.message}</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    disabled={createOrderMutation.isPending}
                    className="w-full btn-gradient text-white py-4 rounded-xl font-semibold text-lg hover:shadow-lg transition-all duration-300"
                  >
                    {createOrderMutation.isPending ? (
                      <div className="flex items-center justify-center">
                        <LoadingSpinner size="sm" className="mr-2" />
                        Procesando pedido...
                      </div>
                    ) : (
                      `Confirmar pedido - ${formatPrice(total.toString())}`
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Order Summary */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-gray-900">
                  Resumen del pedido
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {cartItems.map(({ product, quantity }) => (
                    <div key={product.id} className="flex items-center space-x-4 py-4 border-b">
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-16 h-16 bg-gray-200 rounded-lg object-cover"
                      />
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{product.name}</h4>
                        <p className="text-sm text-gray-500">{product.ageRange} años</p>
                        <p className="text-sm text-gray-500">Cantidad: {quantity}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-mint">
                          {formatPrice((parseFloat(product.price) * quantity).toString())}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-4 mt-4">
                  <div className="flex items-center justify-between text-lg font-semibold">
                    <span>Total:</span>
                    <span className="text-2xl text-mint">{formatPrice(total.toString())}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
