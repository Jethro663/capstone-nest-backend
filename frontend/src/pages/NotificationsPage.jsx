import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const NotificationsPage = () => {
  return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Notifications</h1>
        <Card>
          <CardHeader>
            <CardTitle>Recent Notifications</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">No notifications yet</p>
          </CardContent>
        </Card>
      </div>
  )
}

export default NotificationsPage
