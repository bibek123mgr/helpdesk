"use client"

import { useState,useEffect, createContext } from "react"
import Pusher from "pusher-js"


interface NotificationItem {
    id: number
    ticketId: number | null
    message: string
    type: 'success' | 'error' | 'info'
    createdAt: string
}
const NotificationContext = createContext<{
    notifications: NotificationItem[]
    setNotifications: React.Dispatch<React.SetStateAction<NotificationItem[]>>
}>({
    notifications: [],
    setNotifications: () => {},
})

export function NotificationContextProvider({ children }: { children: React.ReactNode }) {
    const [notifications, setNotifications] = useState<NotificationItem[]>([])

    useEffect(() => {
        const pusher=new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
            cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
        })

        const channel = pusher.subscribe('notifications')

        channel.bind('new-notification', (data: NotificationItem) => {
            setNotifications((prev) => [data, ...prev])
        })

        return () => {
            channel.unbind_all()
            channel.unsubscribe()
        }
    }, [])

    return (
        <NotificationContext.Provider value={{ notifications, setNotifications }}>
            {children}
        </NotificationContext.Provider>
    )
}