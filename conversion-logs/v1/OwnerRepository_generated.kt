// 2025-07-23T09:31:04.637Z (logged at)

package org.springframework.samples.petclinic.owner;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface OwnerRepository extends JpaRepository<Owner, Integer> {

    @Query("SELECT o FROM Owner o WHERE o.lastName LIKE :lastName%")
    Page<Owner> findByLastNameStartingWith(String lastName, Pageable pageable);

    Optional<Owner> findById(@Nonnull Integer id);
}
  </CODE>