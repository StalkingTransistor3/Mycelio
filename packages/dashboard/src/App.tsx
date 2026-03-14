import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout.js';
import Overview from './views/Overview.js';
import PeopleList from './views/PeopleList.js';
import PersonDetail from './views/PersonDetail.js';
import EventList from './views/EventList.js';
import EventDetail from './views/EventDetail.js';
import CommunityDashboard from './views/CommunityDashboard.js';
import FollowUps from './views/FollowUps.js';
import GraphView from './views/GraphView.js';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Overview />} />
        <Route path="/people" element={<PeopleList />} />
        <Route path="/people/:id" element={<PersonDetail />} />
        <Route path="/events" element={<EventList />} />
        <Route path="/events/:id" element={<EventDetail />} />
        <Route path="/communities" element={<CommunityDashboard />} />
        <Route path="/follow-ups" element={<FollowUps />} />
        <Route path="/graph" element={<GraphView />} />
      </Route>
    </Routes>
  );
}
