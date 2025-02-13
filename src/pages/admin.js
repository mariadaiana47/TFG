import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Calendar,
  Users,
  Plus,
  Edit,
  Trash2,
  MapPin,
  Star,
} from "lucide-react";

const AdminDashboard = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("events");
  const [editingEvent, setEditingEvent] = useState(null);
  const [newEvent, setNewEvent] = useState({
    title: "",
    date: "",
    location: "",
    description: "",
    latitude: "",
    longitude: "",
    credits: "",
    actions: [],
    maxParticipants: "",
  });
  const [newAction, setNewAction] = useState({
    title: "",
    description: "",
    requiredVolunteers: "",
    credits: "",
  });

  const fetchEvents = async () => {
    try {
      const response = await fetch("/api/events");
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      if (data.success) {
        setEvents(data.events || []);
        setError(null);
      }
    } catch (error) {
      console.error("Error fetching events:", error);
      setError("Failed to load events");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const userRole = localStorage.getItem("userRole");
    if (userRole !== "admin") {
      window.location.href = "/auth/login";
      return;
    }

    fetchEvents();
    const interval = setInterval(fetchEvents, 10000);
    return () => clearInterval(interval);
  }, []);

  const getLocationCoordinates = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        alert("Geolocation is not supported by your browser");
        reject(new Error("Geolocation is not supported"));
        return;
      }

      const options = {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      };

      const success = (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      };

      const error = (err) => {
        console.warn(`ERROR(${err.code}): ${err.message}`);
        switch (err.code) {
          case err.PERMISSION_DENIED:
            alert("Please allow location access to create an event");
            break;
          case err.POSITION_UNAVAILABLE:
            alert("Location information is unavailable");
            break;
          case err.TIMEOUT:
            alert("Location request timed out");
            break;
          default:
            alert("An unknown error occurred getting location");
        }
        reject(err);
      };

      navigator.geolocation.getCurrentPosition(success, error, options);
    });
  };

  const handleAddAction = () => {
    if (!newAction.title || !newAction.requiredVolunteers) {
      setError("Please fill in all action fields");
      return;
    }

    if (editingEvent) {
      setEditingEvent({
        ...editingEvent,
        actions: [...editingEvent.actions, newAction],
      });
    } else {
      setNewEvent({
        ...newEvent,
        actions: [...newEvent.actions, newAction],
      });
    }

    setNewAction({
      title: "",
      description: "",
      requiredVolunteers: "",
      credits: "",
    });
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();

    try {
      let coordinates;
      try {
        coordinates = await getLocationCoordinates();
      } catch (error) {
        return;
      }

      const eventData = {
        ...newEvent,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        date: new Date(newEvent.date).toISOString(),
        credits: newEvent.credits || null,
        maxParticipants: newEvent.maxParticipants || null,
        actions: newEvent.actions.map((action) => ({
          ...action,
          requiredVolunteers: action.requiredVolunteers || null,
          credits: action.credits || null,
        })),
      };

      let token = localStorage.getItem("authToken");
      if (!token) {
        setError("Not authorized. Please login again.");
        return;
      }

      if (token.startsWith('"') && token.endsWith('"')) {
        token = token.slice(1, -1);
      }

      const response = await fetch("/api/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(eventData),
      });

      const data = await response.json();
      if (!response.ok)
        throw new Error(data.message || "Failed to create event");

      setEvents((prev) => [...prev, data.event]);
      setNewEvent({
        title: "",
        date: "",
        location: "",
        description: "",
        latitude: "",
        longitude: "",
        credits: "",
        actions: [],
        maxParticipants: "",
      });

      setNewAction({
        title: "",
        description: "",
        requiredVolunteers: "",
        credits: "",
      });

      setError(null);
    } catch (error) {
      console.error("Error creating event:", error);
      setError(error.message);
    }
  };

  const handleUpdateEvent = async (e) => {
    e.preventDefault();

    try {
      let coordinates;
      try {
        coordinates = await getLocationCoordinates();
      } catch (error) {
        return;
      }

      const eventData = {
        ...editingEvent,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        credits: editingEvent.credits || null,
        maxParticipants: editingEvent.maxParticipants || null,
        actions: editingEvent.actions.map((action) => ({
          ...action,
          requiredVolunteers: action.requiredVolunteers || null,
          credits: action.credits || null,
        })),
      };

      let token = localStorage.getItem("authToken");
      if (!token) {
        setError("Not authorized. Please login again.");
        return;
      }

      if (token.startsWith('"') && token.endsWith('"')) {
        token = token.slice(1, -1);
      }

      const response = await fetch("/api/events", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: editingEvent._id,
          ...eventData,
        }),
      });

      const data = await response.json();
      if (!response.ok)
        throw new Error(data.message || "Failed to update event");

      setEvents((prev) =>
        prev.map((event) =>
          event._id === editingEvent._id ? data.event : event
        )
      );
      setEditingEvent(null);
      setError(null);
    } catch (error) {
      console.error("Error updating event:", error);
      setError(error.message);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!confirm("Are you sure you want to delete this event?")) {
      return;
    }

    try {
      let token = localStorage.getItem("authToken");
      if (!token) {
        setError("Not authorized. Please login again.");
        return;
      }

      if (token.startsWith('"') && token.endsWith('"')) {
        token = token.slice(1, -1);
      }

      const response = await fetch("/api/events", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id: eventId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to delete event");
      }

      setEvents((prev) => prev.filter((event) => event._id !== eventId));
      setError(null);
    } catch (error) {
      console.error("Error deleting event:", error);
      setError(error.message);
    }
  };

  const handleRequestResponse = async (eventId, requestId, actionId, isApproved) => {
    try {
      let token = localStorage.getItem("authToken");
      if (!token) {
        setError("Not authorized. Please login again.");
        return;
      }
  
      if (token.startsWith('"') && token.endsWith('"')) {
        token = token.slice(1, -1);
      }
  
      const response = await fetch(`/api/events/${eventId}/requests/${requestId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: isApproved ? "approved" : "rejected",
          actionId: actionId || null
        })
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to ${isApproved ? 'approve' : 'reject'} request`);
      }
  
      const data = await response.json();
      
      // Update the events state with the modified event
      setEvents(prev => 
        prev.map(event => {
          if (event._id === eventId) {
            // Update the requests array for the matching event
            const updatedRequests = event.requests.map(request => {
              if (request._id === requestId) {
                return {
                  ...request,
                  status: isApproved ? "approved" : "rejected"
                };
              }
              return request;
            });
            
            return {
              ...event,
              requests: updatedRequests
            };
          }
          return event;
        })
      );
  
      setError(null);
    } catch (error) {
      console.error("Error processing request:", error);
      setError(error.message || "Failed to process request");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="p-6">
        {error && (
          <div className="mb-4 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700">
            {error}
          </div>
        )}

        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <Button
            onClick={() => {
              localStorage.removeItem("authToken");
              localStorage.removeItem("userRole");
              window.location.href = "/auth/login";
            }}
            variant="outline"
            className="bg-red-500 text-white hover:bg-red-600"
          >
            Logout
          </Button>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-4"
        >
          <TabsList>
            <TabsTrigger value="events">Events</TabsTrigger>
            <TabsTrigger value="requests">Requests</TabsTrigger>
          </TabsList>

          <TabsContent value="events">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>
                  {editingEvent ? "Edit Event" : "Create New Event"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={
                    editingEvent ? handleUpdateEvent : handleCreateEvent
                  }
                  className="space-y-4"
                >
                  <Input
                    placeholder="Event Title"
                    value={editingEvent ? editingEvent.title : newEvent.title}
                    onChange={(e) =>
                      editingEvent
                        ? setEditingEvent({
                            ...editingEvent,
                            title: e.target.value,
                          })
                        : setNewEvent({ ...newEvent, title: e.target.value })
                    }
                    required
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      type="date"
                      value={editingEvent ? editingEvent.date : newEvent.date}
                      onChange={(e) =>
                        editingEvent
                          ? setEditingEvent({
                              ...editingEvent,
                              date: e.target.value,
                            })
                          : setNewEvent({ ...newEvent, date: e.target.value })
                      }
                      required
                    />
                    <Input
                      type="number"
                      placeholder="Credits"
                      value={
                        editingEvent ? editingEvent.credits : newEvent.credits
                      }
                      onChange={(e) => {
                        const value = e.target.value
                          ? parseInt(e.target.value)
                          : "";
                        editingEvent
                          ? setEditingEvent({ ...editingEvent, credits: value })
                          : setNewEvent({ ...newEvent, credits: value });
                      }}
                      min="1"
                    />
                  </div>

                  <Input
                    placeholder="Location"
                    value={
                      editingEvent ? editingEvent.location : newEvent.location
                    }
                    onChange={(e) =>
                      editingEvent
                        ? setEditingEvent({
                            ...editingEvent,
                            location: e.target.value,
                          })
                        : setNewEvent({ ...newEvent, location: e.target.value })
                    }
                    required
                  />

                  <Input
                    type="number"
                    placeholder="Maximum Participants"
                    value={
                      editingEvent
                        ? editingEvent.maxParticipants
                        : newEvent.maxParticipants
                    }
                    onChange={(e) => {
                      const value = e.target.value
                        ? parseInt(e.target.value)
                        : "";
                      editingEvent
                        ? setEditingEvent({
                            ...editingEvent,
                            maxParticipants: value,
                          })
                        : setNewEvent({ ...newEvent, maxParticipants: value });
                    }}
                    min="1"
                  />

                  <Textarea
                    placeholder="Event Description"
                    value={
                      editingEvent
                        ? editingEvent.description
                        : newEvent.description
                    }
                    onChange={(e) =>
                      editingEvent
                        ? setEditingEvent({
                            ...editingEvent,
                            description: e.target.value,
                          })
                        : setNewEvent({
                            ...newEvent,
                            description: e.target.value,
                          })
                    }
                    required
                  />

                  {/* Actions Section */}
                  <div className="border p-4 rounded-lg space-y-4">
                    <h3 className="font-semibold">Actions</h3>
                    <div className="space-y-2">
                      <Input
                        placeholder="Action Title"
                        value={newAction.title}
                        onChange={(e) =>
                          setNewAction({ ...newAction, title: e.target.value })
                        }
                      />
                      <Textarea
                        placeholder="Action Description"
                        value={newAction.description}
                        onChange={(e) =>
                          setNewAction({
                            ...newAction,
                            description: e.target.value,
                          })
                        }
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type="number"
                          placeholder="Required Volunteers"
                          value={newAction.requiredVolunteers}
                          onChange={(e) => {
                            const value = e.target.value
                              ? parseInt(e.target.value)
                              : "";
                            setNewAction({
                              ...newAction,
                              requiredVolunteers: value,
                            });
                          }}
                          min="1"
                        />
                        <Input
                          type="number"
                          placeholder="Action Credits"
                          value={newAction.credits}
                          onChange={(e) => {
                            const value = e.target.value
                              ? parseInt(e.target.value)
                              : "";
                            setNewAction({ ...newAction, credits: value });
                          }}
                          min="1"
                        />
                      </div>
                      <Button
                        type="button"
                        onClick={handleAddAction}
                        className="w-full bg-blue-500 hover:bg-blue-600 text-white"
                      >
                        Add Action
                      </Button>
                    </div>

                    {/* Display current actions */}
                    <div className="mt-4 space-y-2">
                      {(editingEvent
                        ? editingEvent.actions
                        : newEvent.actions
                      ).map((action, index) => (
                        <div key={index} className="bg-gray-50 p-3 rounded-lg">
                          <div className="flex justify-between items-center">
                            <h4 className="font-medium">{action.title}</h4>
                            <div className="flex items-center gap-2">
                              {action.requiredVolunteers && (
                                <>
                                  <Users className="w-4 h-4" />
                                  <span>{action.requiredVolunteers}</span>
                                </>
                              )}
                              {action.credits && (
                                <>
                                  <Star className="w-4 h-4" />
                                  <span>{action.credits}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-gray-600">
                            {action.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <Button
                      type="submit"
                      className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
                    >
                      {editingEvent ? (
                        <>
                          <Edit className="w-4 h-4 mr-2" />
                          Update Event
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 mr-2" />
                          Create Event
                        </>
                      )}
                    </Button>
                    {editingEvent && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setEditingEvent(null)}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Events List */}
            {loading ? (
              <div className="text-center py-4">Loading events...</div>
            ) : (
              <div className="space-y-4">
                {events.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">
                    No events found
                  </div>
                ) : (
                  events.map((event) => (
                    <Card key={event._id}>
                      <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>{event.title}</CardTitle>
                        <div className="flex space-x-2">
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => setEditingEvent(event)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="destructive"
                            onClick={() => handleDeleteEvent(event._id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              <span>
                                {new Date(event.date).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4" />
                              <span>{event.location}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Star className="w-4 h-4" />
                            <span>{event.credits} credits</span>
                            <Users className="w-4 h-4 ml-4" />
                            <span>
                              {event.maxParticipants} max participants
                            </span>
                          </div>
                          <p className="text-gray-600">{event.description}</p>

                          {/* Actions List */}
                          {event.actions && event.actions.length > 0 && (
                            <div className="mt-4">
                              <h4 className="font-semibold mb-2">Actions</h4>
                              <div className="space-y-2">
                                {event.actions.map((action, index) => (
                                  <div
                                    key={index}
                                    className="bg-gray-50 p-3 rounded-lg"
                                  >
                                    <div className="flex justify-between items-center">
                                      <h5 className="font-medium">
                                        {action.title}
                                      </h5>
                                      <div className="flex items-center gap-2">
                                        <Users className="w-4 h-4" />
                                        <span>{action.requiredVolunteers}</span>
                                        <Star className="w-4 h-4" />
                                        <span>{action.credits}</span>
                                      </div>
                                    </div>
                                    <p className="text-sm text-gray-600 mt-1">
                                      {action.description}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="requests">
            <Card>
              <CardHeader>
                <CardTitle>Participation Requests</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-4">Loading requests...</div>
                ) : events.some((event) => event.requests?.length > 0) ? (
                  events.map((event) => (
                    <div
                      key={event._id}
                      className="mb-6 border-b pb-4 last:border-b-0"
                    >
                      <h3 className="font-semibold text-lg mb-2">
                        {event.title}
                      </h3>

                      {/* Pending Requests */}
                      {event.requests?.filter((req) => req.status === "pending")
                        .length > 0 && (
                        <div className="mb-4">
                          <h4 className="text-sm font-medium text-gray-600 mb-2">
                            Pending Requests:
                          </h4>
                          <div className="space-y-3">
                            {event.requests
                              .filter((req) => req.status === "pending")
                              .map((request) => (
                                <div
                                  key={request._id}
                                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                                >
                                  <div>
                                    <p className="font-medium">
                                      {request.volunteerName}
                                    </p>
                                    <p className="text-sm text-gray-500">
                                      Applied:{" "}
                                      {new Date(
                                        request.appliedAt
                                      ).toLocaleDateString()}
                                    </p>
                                    {request.actionId && (
                                      <p className="text-sm text-gray-500">
                                        Action:{" "}
                                        {
                                          event.actions.find(
                                            (a) => a._id === request.actionId
                                          )?.title
                                        }
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex gap-2">
                                    <Button
                                      onClick={() =>
                                        handleRequestResponse(
                                          event._id,
                                          request._id,
                                          request.actionId,
                                          true
                                        )
                                      }
                                      variant="outline"
                                      className="bg-green-50 hover:bg-green-100 text-green-600"
                                    >
                                      Approve
                                    </Button>
                                    <Button
                                      onClick={() =>
                                        handleRequestResponse(
                                          event._id,
                                          request._id,
                                          request.actionId,
                                          false
                                        )
                                      }
                                      variant="outline"
                                      className="bg-red-50 hover:bg-red-100 text-red-600"
                                    >
                                      Reject
                                    </Button>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}

                      {/* Approved Volunteers */}
                      {event.requests?.filter(
                        (req) => req.status === "approved"
                      ).length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-600 mb-2">
                            Approved Volunteers:
                          </h4>
                          <div className="space-y-2">
                            {event.requests
                              .filter((req) => req.status === "approved")
                              .map((request) => (
                                <div
                                  key={request._id}
                                  className="p-3 bg-green-50 rounded-lg text-green-700"
                                >
                                  <p className="font-medium">
                                    {request.volunteerName}
                                  </p>
                                  {request.actionId && (
                                    <p className="text-sm">
                                      Action:{" "}
                                      {
                                        event.actions.find(
                                          (a) => a._id === request.actionId
                                        )?.title
                                      }
                                    </p>
                                  )}
                                </div>
                              ))}
                          </div>
                        </div>
                      )}

                      {!event.requests?.length && (
                        <p className="text-gray-500 italic">
                          No requests for this event
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-center text-gray-500 py-4">
                    No pending requests
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
