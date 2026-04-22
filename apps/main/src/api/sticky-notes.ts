import { client } from "./client";
import { API_ENDPOINTS } from "./endpoints";

/**
 * Fetch all sticky notes
 * Returns wrapped response with .data.stickyNotes
 */
export const getStickyNotes = async () => {
    try {
        const response = await client.get(API_ENDPOINTS.STICKY_NOTES);
        console.log("✅ Sticky Notes List Response:", response.data);
        return response.data;
    } catch (error) {
        console.error("❌ Error fetching sticky notes:", error);
        throw error;
    }
};

/**
 * Fetch a single sticky note by ID
 */
export const getStickyNoteDetail = async (id: string) => {
    try {
        const response = await client.get(`${API_ENDPOINTS.STICKY_NOTES}/${id}`);
        console.log("✅ Sticky Note Detail Response:", response.data);
        return response.data;
    } catch (error) {
        console.error("❌ Error fetching sticky note detail:", error);
        throw error;
    }
};

/**
 * Create a new sticky note
 * POST body: { name: string, description: string }
 */
export const createStickyNote = async (data: {
    name: string;
    description: string;
}) => {
    try {
        const response = await client.post(API_ENDPOINTS.STICKY_NOTES, data);
        console.log("✅ Create Sticky Note Response:", response.data);
        return response.data;
    } catch (error) {
        console.error("❌ Error creating sticky note:", error);
        throw error;
    }
};

/**
 * Update a sticky note by ID
 * PUT body: { name?: string, description?: string }
 */
export const updateStickyNote = async (
    id: string,
    data: {
        name?: string;
        description?: string;
    }
) => {
    try {
        const response = await client.put(`${API_ENDPOINTS.STICKY_NOTES}/${id}`, data);
        console.log("✅ Update Sticky Note Response:", response.data);
        return response.data;
    } catch (error) {
        console.error("❌ Error updating sticky note:", error);
        throw error;
    }
};

/**
 * Delete a sticky note by ID
 */
export const deleteStickyNote = async (id: string) => {
    try {
        const response = await client.delete(`${API_ENDPOINTS.STICKY_NOTES}/${id}`);
        console.log("✅ Delete Sticky Note Response:", response.data);
        return response.data;
    } catch (error) {
        console.error("❌ Error deleting sticky note:", error);
        throw error;
    }
};
