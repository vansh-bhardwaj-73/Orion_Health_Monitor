// FILE: client/app.js

const API_BASE = 'http://localhost:3000/api';

let userId = null;

// Create User
const createUser = async (data) => {
  try {
    const res = await fetch(`${API_BASE}/users/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const result = await res.json();

    if (!res.ok) {
      throw new Error(result.error || 'Failed to create user');
    }

    userId = result.id || result._id;
    return userId;
  } catch (error) {
    console.error('Create User Error:', error.message);
    throw error;
  }
};

// Submit Symptom + Fetch Latest
const submitSymptom = async (data) => {
  try {
    if (!userId) {
      throw new Error('User not created');
    }

    // Step 1: POST symptom
    const postRes = await fetch(`${API_BASE}/symptoms/log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        ...data,
      }),
    });

    const postResult = await postRes.json();

    if (!postRes.ok) {
      throw new Error(postResult.error || 'Failed to log symptom');
    }

    // Step 2: GET all symptoms
    const getRes = await fetch(`${API_BASE}/symptoms/${userId}`);
    const getResult = await getRes.json();

    if (!getRes.ok) {
      throw new Error(getResult.error || 'Failed to fetch symptoms');
    }

    // Step 3: Get latest
    const latest = getResult[getResult.length - 1];

    // Step 4: Display
    displayResult(latest);

    return latest;
  } catch (error) {
    console.error('Submit Symptom Error:', error.message);
    throw error;
  }
};

// Fetch Symptoms by User
const fetchUserSymptoms = async () => {
  try {
    if (!userId) {
      throw new Error('User not created');
    }

    const res = await fetch(`${API_BASE}/symptoms/${userId}`);
    const result = await res.json();

    if (!res.ok) {
      throw new Error(result.error || 'Failed to fetch symptoms');
    }

    const latest = result[result.length - 1];
    displayResult(latest);

    return latest;
  } catch (error) {
    console.error('Fetch Symptoms Error:', error.message);
    throw error;
  }
};

// Display Result
const displayResult = (data) => {
  if (!data) return;

  document.getElementById('severity').innerText = data.severity || '';
  document.getElementById('responseMsg').innerText =
    data.response?.message || '';

  const actionsList = document.getElementById('actions');
  actionsList.innerHTML = '';

  if (data.response?.action) {
    data.response.action.forEach((action) => {
      const li = document.createElement('li');
      li.innerText = action;
      actionsList.appendChild(li);
    });
  }

  const locLink = document.getElementById('locationLink');
  if (data.location?.mapLink) {
    locLink.href = data.location.mapLink;
    locLink.innerText = data.location.mapLink;
  } else {
    locLink.innerText = 'N/A';
    locLink.removeAttribute('href');
  }

  const alertLink = document.getElementById('alertLink');
  if (data.alert?.whatsappLink) {
    alertLink.href = data.alert.whatsappLink;
    alertLink.innerText = 'Send Alert via WhatsApp';
  } else {
    alertLink.innerText = 'N/A';
    alertLink.removeAttribute('href');
  }
};

// Expose functions globally
window.OrionApp = {
  createUser,
  submitSymptom,
  fetchUserSymptoms,
  displayResult,
};