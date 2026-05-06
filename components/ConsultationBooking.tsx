"use client";

import { useState, useEffect } from "react";
import { Card, Button } from "./ui/Card";
import { getAvailableSlots, bookConsultation } from "@/app/[lang]/coach/leads/booking-actions";

interface Slot {
  id: string;
  startTime: string;
  endTime: string;
}

export default function ConsultationBooking() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
  });
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchSlots = async () => {
      const result = await getAvailableSlots();
      if (result.success && result.slots) {
        setSlots(
          result.slots.map((slot: any) => ({
            id: slot.id,
            startTime: new Date(slot.startTime).toLocaleString(),
            endTime: new Date(slot.endTime).toLocaleString(),
          }))
        );
      }
      setLoading(false);
    };
    fetchSlots();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot || !formData.name || !formData.email) {
      setError("Please select a slot and fill in your name and email");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const result = await bookConsultation(
        selectedSlot.id,
        formData.name,
        formData.email,
        formData.phone || undefined
      );

      if (result.success) {
        setShowSuccess(true);
        setFormData({ name: "", email: "", phone: "" });
        setSelectedSlot(null);
        // Refresh slots
        const slotsResult = await getAvailableSlots();
        if (slotsResult.success && slotsResult.slots) {
          setSlots(
            slotsResult.slots.map((slot: any) => ({
              id: slot.id,
              startTime: new Date(slot.startTime).toLocaleString(),
              endTime: new Date(slot.endTime).toLocaleString(),
            }))
          );
        }
        setTimeout(() => setShowSuccess(false), 4000);
      } else {
        setError(result.error || "Failed to book consultation");
      }
    } catch (err) {
      setError("An error occurred while booking your consultation");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (showSuccess) {
    return (
      <>
        <div className="fixed inset-0 bg-black/50 z-40" />
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-[var(--success-soft)] border-[var(--success)]/30">
            <div className="text-center space-y-4">
              <div className="text-5xl">✅</div>
              <h2 className="text-2xl font-bold text-[var(--ink)]">
                Consultation Booked!
              </h2>
              <p className="text-sm text-[var(--ink-muted)]">
                Thank you for booking a free consultation with us! You'll
                receive a confirmation email shortly with all the details.
              </p>
              <p className="text-sm text-[var(--ink-muted)]">
                Our coach will get in touch with you soon.
              </p>
              <div className="text-xs text-[var(--ink-muted)] pt-2">
                Redirecting...
              </div>
            </div>
          </Card>
        </div>
      </>
    );
  }

  return (
    <Card className="p-6">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold mb-2">Free Consultation</h2>
        <p className="text-sm text-[var(--ink-muted)] mb-6">
          Book a free 15-20 minute consultation with our coach to discuss your
          fitness goals and how we can help you achieve them.
        </p>

        {loading ? (
          <div className="text-center py-8">Loading available slots...</div>
        ) : slots.length === 0 ? (
          <div className="text-center py-8 text-[var(--ink-muted)]">
            No available slots at the moment. Please try again later.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Available Slots */}
            <div>
              <label className="block text-sm font-semibold mb-3">
                Select a Time Slot
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {slots.map((slot) => (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => setSelectedSlot(slot)}
                    className={`p-3 rounded-lg border transition text-left text-sm ${
                      selectedSlot?.id === slot.id
                        ? "bg-[var(--primary-soft)] border-[var(--primary)]"
                        : "border-[var(--border)] hover:bg-[var(--surface-2)]"
                    }`}
                  >
                    <div className="font-medium">📅 {slot.startTime}</div>
                    <div className="text-xs text-[var(--ink-muted)]">
                      (15-20 min)
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Contact Info */}
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Your Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Enter your name"
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="your@email.com"
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">
                  Phone (Optional)
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="+34 XXX XXX XXX"
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] text-sm"
                />
              </div>
            </div>

            {error && (
              <div className="text-sm text-[var(--danger)] bg-[var(--danger-soft)] p-3 rounded">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={!selectedSlot || submitting}
              className="w-full"
            >
              {submitting ? "Booking..." : "Book Your Free Consultation"}
            </Button>

            <p className="text-xs text-[var(--ink-muted)] text-center">
              🎥 You'll join a video call via Google Meet. No software installation
              needed.
            </p>
          </form>
        )}
      </div>
    </Card>
  );
}
