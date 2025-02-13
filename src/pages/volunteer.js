import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, Users } from "lucide-react";
import { useRouter } from "next/router";
import Swal from "sweetalert2";

const VolunteerDashboard = () => {
  const router = useRouter();
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({
    location: "",
    type: "",
  });

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/events");

      if (!response.ok) {
        throw new Error("Failed to fetch events");
      }

      const data = await response.json();
      setEvents(data.events || []);
      setFilteredEvents(data.events || []);
    } catch (error) {
      console.error("Error fetching events:", error);
      setError("Failed to load events");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    const filterEvents = () => {
      let filtered = events;
      if (filters.location) {
        filtered = filtered.filter((event) =>
          event.location.toLowerCase().includes(filters.location.toLowerCase())
        );
      }
      if (filters.type) {
        filtered = filtered.filter((event) =>
          event.type?.toLowerCase().includes(filters.type.toLowerCase())
        );
      }
      setFilteredEvents(filtered);
    };
    filterEvents();
  }, [filters, events]);

  const handleApplyRequest = async (eventId) => {
    try {
      const token = localStorage.getItem("authToken");
      console.log("Stored token:", token); // Debug log
      
      if (!token) {
        router.push("/auth/login");
        return;
      }
  
      // Parse the token if it's stored as a JSON string
      let processedToken = token;
      try {
        if (token.startsWith('"') && token.endsWith('"')) {
          processedToken = JSON.parse(token);
        }
      } catch (e) {
        console.error("Token parse error:", e);
      }
  
      console.log("Processed token:", processedToken); // Debug log
  
      const response = await fetch("/api/events/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${processedToken}`
        },
        body: JSON.stringify({ eventId })
      });
  
      const data = await response.json();
      console.log("Response data:", data); // Debug log
  
      if (!response.ok) {
        throw new Error(data.message || "Failed to submit application");
      }
  
      await Swal.fire({
        title: "Success!",
        text: "Your application has been submitted successfully!",
        icon: "success",
        timer: 2000,
        showConfirmButton: false
      });
      
      await fetchEvents();
      
    } catch (error) {
      console.error("Error applying:", error);
      Swal.fire({
        title: "Error!",
        text: error.message || "Failed to submit application",
        icon: "error",
        timer: 2000
      });
    }
  };

  if (loading) {
    return <div className="text-center py-4">Loading events...</div>;
  }

  if (error) {
    return <div className="text-red-500 text-center py-4">{error}</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Volunteer Dashboard</h1>

      <div className="space-y-4 mb-6">
        <Input
          placeholder="Filter by Location"
          value={filters.location}
          onChange={(e) =>
            setFilters((prev) => ({ ...prev, location: e.target.value }))
          }
        />
        <Input
          placeholder="Filter by Event Type"
          value={filters.type}
          onChange={(e) =>
            setFilters((prev) => ({ ...prev, type: e.target.value }))
          }
        />
      </div>

      <h2 className="text-2xl font-bold mb-4">Available Events</h2>

      {filteredEvents.length === 0 ? (
        <p className="text-center text-gray-500">
          No events found matching your filters.
        </p>
      ) : (
        <div className="space-y-4">
          {filteredEvents.map((event) => (
            <Card key={event._id}>
              <CardHeader>
                <CardTitle>{event.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>{new Date(event.date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span>{event.location}</span>
                  </div>
                  <p>{event.description}</p>

                  <Button
                    onClick={() => handleApplyRequest(event._id)}
                    className="w-full"
                  >
                    Apply to Participate
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default VolunteerDashboard;

// Userul 1 poate sa filtreze voluntariatele disponibile pe baza de locatie, tipuri, etc si sa aplice la ele. Cand isi face cont va crea un profil, adresa, data nastere, interese, etc. profil pe care il poate modifica
// Poză de profil/Editare profil (funcție)