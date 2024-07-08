import React from 'react';
import HomeContainer from '../containers/HomeContainer';
import useUserData from '../hooks/useUserData';

const Home = () => {
  const { user } = useUserData();

  return (
    <div>
      <HomeContainer user={user} />
    </div>
  );
};

export default Home;
