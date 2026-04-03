import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout.js';
import Overview from './views/Overview.js';
import PeopleList from './views/PeopleList.js';
import PersonDetail from './views/PersonDetail.js';
import EventList from './views/EventList.js';
import EventDetail from './views/EventDetail.js';
import OrganizationList from './views/OrganizationList.js';
import OrganizationDetail from './views/OrganizationDetail.js';
import FollowUps from './views/FollowUps.js';
import PipelineView from './views/PipelineView.js';
import VenueList from './views/VenueList.js';
import CampaignList from './views/CampaignList.js';
import CampaignDetail from './views/CampaignDetail.js';
import ProjectList from './views/ProjectList.js';
import ProjectDetail from './views/ProjectDetail.js';
import GanttView from './views/GanttView.js';
import GraphView from './views/GraphView.js';
import MyEvents from './views/MyEvents.js';
import PersonNetwork from './views/PersonNetwork.js';
import OrgNetwork from './views/OrgNetwork.js';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Overview />} />
        <Route path="/people" element={<PeopleList />} />
        <Route path="/people/:id" element={<PersonDetail />} />
        <Route path="/my-events" element={<MyEvents />} />
        <Route path="/events" element={<EventList />} />
        <Route path="/events/:id" element={<EventDetail />} />
        <Route path="/organisations" element={<OrganizationList />} />
        <Route path="/organisations/:id" element={<OrganizationDetail />} />
        <Route path="/follow-ups" element={<FollowUps />} />
        <Route path="/pipeline" element={<PipelineView />} />
        <Route path="/campaigns" element={<CampaignList />} />
        <Route path="/campaigns/:id" element={<CampaignDetail />} />
        <Route path="/projects" element={<ProjectList />} />
        <Route path="/projects/:id" element={<ProjectDetail />} />
        <Route path="/gantt" element={<GanttView />} />
        <Route path="/venues" element={<VenueList />} />
        <Route path="/network/people" element={<PersonNetwork />} />
        <Route path="/network/orgs" element={<OrgNetwork />} />
        <Route path="/graph" element={<GraphView />} />
      </Route>
    </Routes>
  );
}
