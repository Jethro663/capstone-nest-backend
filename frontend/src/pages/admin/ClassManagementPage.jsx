import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Alert,
    CircularProgress
} from '@mui/material';
import { Add, Edit, Delete } from '@mui/icons-material';

const ClassManagementPage = () => {
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [openDialog, setOpenDialog] = useState(false);
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [selectedClass, setSelectedClass] = useState(null);
    const [formData, setFormData] = useState({ name: '', description: '', teacherId: '' });

    useEffect(() => {
        fetchClasses();
    }, []);

    const fetchClasses = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/classes');
            const data = await response.json();
            setClasses(data);} catch (err) {
            setError('Failed to fetch classes');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDialog = (classItem = null) => {
        if (classItem) {
            setSelectedClass(classItem);
            setFormData({ name: classItem.name, description: classItem.description, teacherId: classItem.teacherId });
        } else {
            setSelectedClass(null);
            setFormData({ name: '', description: '', teacherId: '' });
        }
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setSelectedClass(null);
        setFormData({ name: '', description: '', teacherId: '' });
    };

    const handleSubmit = async () => {
        try {
            const url = selectedClass ? `/api/classes/${selectedClass.id}` : '/api/classes';
            const method = selectedClass ? 'PUT' : 'POST';

            await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            handleCloseDialog();
            fetchClasses();
        } catch (err) {
            setError('Failed to save class');
        }
    };

    const handleDelete = async () => {
        try {
            await fetch(`/api/classes/${selectedClass.id}`, { method: 'DELETE' });
            setOpenDeleteDialog(false);
            setSelectedClass(null);
            fetchClasses();
        } catch (err) {
            setError('Failed to delete class');
        }
    };

    if (loading) return <CircularProgress />;

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h4">Class Management</Typography>
                <Button variant="contained" startIcon={<Add />} onClick={() => handleOpenDialog()}>
                    Add Class
                </Button>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Name</TableCell>
                            <TableCell>Description</TableCell>
                            <TableCell>Teacher</TableCell>
                            <TableCell align="right">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {classes.map((classItem) => (
                            <TableRow key={classItem.id}>
                                <TableCell>{classItem.name}</TableCell>
                                <TableCell>{classItem.description}</TableCell>
                                <TableCell>{classItem.teacherName}</TableCell>
                                <TableCell align="right">
                                    <IconButton onClick={() => handleOpenDialog(classItem)}><Edit /></IconButton>
                                    <IconButton onClick={() => { setSelectedClass(classItem); setOpenDeleteDialog(true); }}><Delete /></IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                <DialogTitle>{selectedClass ? 'Edit Class' : 'Add Class'}</DialogTitle>
                <DialogContent>
                    <TextField fullWidth label="Name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} margin="normal" />
                    <TextField fullWidth label="Description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} margin="normal" multiline rows={3} />
                    <TextField fullWidth label="Teacher ID" value={formData.teacherId} onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })} margin="normal" />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>Cancel</Button>
                    <Button onClick={handleSubmit} variant="contained">Save</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
                <DialogTitle>Confirm Delete</DialogTitle>
                <DialogContent>Are you sure you want to delete this class?</DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDeleteDialog(false)}>Cancel</Button>
                    <Button onClick={handleDelete} color="error" variant="contained">Delete</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default ClassManagementPage;
