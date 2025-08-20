package org.springframework.samples.petclinic.owner

import java.util.List
import java.util.Optional
import jakarta.annotation.Nonnull
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.lang.NonNull
import org.springframework.data.jpa.repository.JpaRepository

interface OwnerRepository : JpaRepository<Owner, Int> {

    /**
     * Retrieve [Owner]s from the data store by last name, returning all owners
     * whose last name starts with the given name.
     *
     * @param lastName Value to search for (can be null)
     * @param pageable Pagination parameters
     * @return a Collection of matching [Owner]s (or an empty Collection if none found)
     */
    fun findByLastNameStartingWith(lastName: String?, pageable: Pageable): Page<Owner>

    /**
     * Retrieve an [Owner] from the data store by id.
     *
     * @param id the id to search for
     * @return an [Optional] containing the [Owner] if found, or an empty [Optional] if not found.
     */
    fun findById(id: Int): Optional<Owner>

}