'use client'

import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Sparkles, Check } from 'lucide-react'

export default function OrderSuccessPage() {
  const params = useSearchParams()
  const orderId = params.get('orderId') || 'Unknown'

  // In a real app, fetch full details by orderId here.

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Order Successfully Placed!</h1>
          <p className="text-lg text-gray-600">Thank you for your order. We'll start processing it right away.</p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              Order Confirmation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-700">Order ID</Label>
                <p className="text-lg font-mono bg-gray-100 p-2 rounded">{orderId}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700">Estimated Delivery</Label>
                <p className="text-lg text-green-600 font-semibold">We\'ll email you shortly</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row gap-4">
          <Button
            onClick={() => (window.location.href = '/')}
            className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            size="lg"
          >
            Continue Shopping
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            size="lg"
            onClick={() => window.open(`mailto:support@virtualtryon.com?subject=Order ${orderId}`, '_blank')}
          >
            Contact Support
          </Button>
        </div>
      </div>
    </div>
  )
}
